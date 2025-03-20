import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from '../client/jira-client.js';
import { ObjectOperation, ToolResponse } from '../types/index.js';
import { formatAttributes } from '../utils/attribute-utils.js';
import { validateAqlQuery, formatAqlForRequest, getExampleQueriesWithContext, getContextualErrorMessage } from '../utils/enhanced-aql-utils.js';
import { handleError } from '../utils/error-handler.js';
import { getSchemaForValidation } from '../utils/schema-cache-manager.js';

/**
 * Simplifies an Insight object by extracting only essential information
 * @param object The original Insight object
 * @returns A simplified version with only key-value pairs
 */
function simplifyInsightObject(object: any) {
  if (!object) return null;
  
  // Extract only essential object information
  const simplified: Record<string, any> = {};
  
  // Include only populated basic properties
  if (object.id) simplified.id = object.id;
  if (object.objectKey) simplified.key = object.objectKey;
  if (object.name || object.label) simplified.name = object.name || object.label;
  if (object.objectType?.name) simplified.type = object.objectType.name;
  
  // Explicitly omit icon properties
  // We don't include 'icon' property at all in the simplified output
  
  // Extract attribute values into a simple key-value format
  if (object.attributes && Array.isArray(object.attributes) && object.attributes.length > 0) {
    const attributes: Record<string, any> = {};
    
    for (const attr of object.attributes) {
      if (!attr.objectTypeAttributeId || !attr.objectAttributeValues || attr.objectAttributeValues.length === 0) continue;
      
      // Try to get a meaningful attribute name
      let attrName: string;
      if (attr.name) {
        attrName = attr.name;
      } else {
        // Look for the attribute definition in objectTypeAttributes if available
        const attrDef = object.objectTypeAttributes?.find((a: any) => a.id === attr.objectTypeAttributeId);
        attrName = attrDef?.name || `attr_${attr.objectTypeAttributeId}`;
      }
      
      // Process the attribute values
      if (attr.objectAttributeValues.length === 1) {
        // Single value
        const val: any = attr.objectAttributeValues[0];
        
        // Handle reference objects
        if (val.referencedObject) {
          const refObj: Record<string, any> = {};
          if (val.referencedObject.id) refObj.id = val.referencedObject.id;
          if (val.referencedObject.objectKey) refObj.key = val.referencedObject.objectKey;
          if (val.referencedObject.name || val.referencedObject.label) {
            refObj.name = val.referencedObject.name || val.referencedObject.label;
          }
          
          // Only add if we have some data
          if (Object.keys(refObj).length > 0) {
            attributes[attrName] = refObj;
          }
        } else if (val.status?.name) {
          // Handle status values
          attributes[attrName] = val.status.name;
        } else if (val.value || val.displayValue) {
          // Handle simple values
          attributes[attrName] = val.value || val.displayValue;
        }
      } else if (attr.objectAttributeValues.length > 1) {
        // Multiple values
        const values = attr.objectAttributeValues
          .map((val: any) => {
            if (val.referencedObject) {
              const refObj: Record<string, any> = {};
              if (val.referencedObject.id) refObj.id = val.referencedObject.id;
              if (val.referencedObject.objectKey) refObj.key = val.referencedObject.objectKey;
              if (val.referencedObject.name || val.referencedObject.label) {
                refObj.name = val.referencedObject.name || val.referencedObject.label;
              }
              // Explicitly omit icon properties from referenced objects
              return Object.keys(refObj).length > 0 ? refObj : null;
            } else if (val.status?.name) {
              return val.status.name;
            } else {
              return val.value || val.displayValue || null;
            }
          })
          .filter((v: any) => v !== null); // Remove null values
        
        // Only add if we have values
        if (values.length > 0) {
          attributes[attrName] = values;
        }
      }
    }
    
    // Only add attributes if we have some
    if (Object.keys(attributes).length > 0) {
      simplified.attributes = attributes;
    }
  }
  
  return simplified;
}

/**
 * Simplifies the query results by extracting only essential information
 * @param queryResults The original query results
 * @param metadata Optional metadata to include in the response
 * @returns A simplified version with only key-value pairs
 */
function simplifyQueryResults(queryResults: any, metadata?: Record<string, any>) {
  if (!queryResults) return null;
  
  const simplified: Record<string, any> = {};
  
  // Include only essential pagination info
  if (queryResults.startAt !== undefined) simplified.startAt = queryResults.startAt;
  if (queryResults.maxResults !== undefined) simplified.maxResults = queryResults.maxResults;
  if (queryResults.total !== undefined) simplified.total = queryResults.total;
  
  // Process values if they exist
  if (Array.isArray(queryResults.values)) {
    const simplifiedValues = queryResults.values
      .map(simplifyInsightObject)
      .filter(Boolean); // Remove null values
    
    if (simplifiedValues.length > 0) {
      simplified.values = simplifiedValues;
    } else {
      simplified.values = [];
    }
  } else {
    simplified.values = [];
  }
  
  // Include any additional metadata
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        simplified[key] = value;
      }
    });
  }
  
  return simplified;
}

/**
 * Set up object handlers for the MCP server
 * @param server The MCP server instance
 * @param jiraClient The Jira client instance
 * @param request The request object
 * @returns The response object
 */
export async function setupObjectHandlers(
  server: Server,
  jiraClient: JiraClient,
  request: any
): Promise<ToolResponse> {
  const { arguments: args } = request.params;
  const operation = args.operation as ObjectOperation;

  // Normalize parameter names (support both camelCase and snake_case)
  const objectId = args.objectId || args.object_id;
  const objectTypeId = args.objectTypeId || args.object_type_id;
  const startAt = args.startAt || args.start_at || 0;
  const maxResults = args.maxResults || args.max_results || 50;
  
  // Normalize attribute inclusion parameters with defaults
  const includeAttributes = args.includeAttributes !== undefined ? args.includeAttributes : true;
  const includeAttributesDeep = args.includeAttributesDeep !== undefined ? args.includeAttributesDeep : 1;
  const includeTypeAttributes = args.includeTypeAttributes !== undefined ? args.includeTypeAttributes : false;
  const includeExtendedInfo = args.includeExtendedInfo !== undefined ? args.includeExtendedInfo : false;
  const simplifiedResponse = args.simplifiedResponse !== undefined ? args.simplifiedResponse : true;

  try {
    const assetsApi = await jiraClient.getAssetsApi();

    switch (operation) {
    case 'get': {
      if (!objectId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object ID is required for get operation');
      }

      const object = await assetsApi.objectFind({ id: objectId });
      
      // Apply simplification if requested
      const responseData = simplifiedResponse 
        ? simplifyInsightObject(object)
        : object;
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responseData, null, 2),
          },
        ],
      };
    }

    case 'list': {
      if (!objectTypeId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object Type ID is required for list operation');
      }

      // Note: There doesn't seem to be a direct replacement for getObjects in the new API
      // We'll use objectsByAql with a query that filters by objectTypeId
      const objectsList = await assetsApi.objectsByAql({
        requestBody: {
          qlQuery: `objectType = ${objectTypeId}`  // Changed from 'aql' to 'qlQuery' to match API documentation
        },
        startAt,
        maxResults,
        includeAttributes,
        includeAttributesDeep,
        includeTypeAttributes,
        includeExtendedInfo
      });

      // Apply simplification if requested
      const responseData = simplifiedResponse 
        ? simplifyQueryResults(objectsList)
        : objectsList;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responseData, null, 2),
          },
        ],
      };
    }

    case 'create': {
      if (!objectTypeId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object Type ID is required for create operation');
      }

      if (!args.name) {
        throw new McpError(ErrorCode.InvalidParams, 'Name is required for create operation');
      }

      // Format attributes using the utility
      const attributeValues = args.attributes ? formatAttributes(args.attributes) : [];

      const newObject = await assetsApi.objectCreate({
        objectIn: {
          name: args.name,
          objectTypeId,
          attributes: attributeValues,
        },
      });

      // Apply simplification if requested
      const responseData = simplifiedResponse 
        ? simplifyInsightObject(newObject)
        : newObject;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responseData, null, 2),
          },
        ],
      };
    }

    case 'update': {
      if (!objectId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object ID is required for update operation');
      }

      // First get the existing object
      const existingObject = await assetsApi.objectFind({ id: objectId }) as {
          name: string;
          objectTypeId: string;
        };

      // Format attributes using the utility
      const attributeValues = args.attributes ? formatAttributes(args.attributes) : [];

      // Update with new values
      const updatedObject = await assetsApi.objectUpdate({
        id: objectId,
        objectIn: {
          name: args.name || existingObject.name,
          objectTypeId: existingObject.objectTypeId,
          attributes: attributeValues.length > 0 ? attributeValues : undefined,
        },
      });

      // Apply simplification if requested
      const responseData = simplifiedResponse 
        ? simplifyInsightObject(updatedObject)
        : updatedObject;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(responseData, null, 2),
          },
        ],
      };
    }

    case 'delete': {
      if (!objectId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object ID is required for delete operation');
      }

      await assetsApi.objectDelete({ id: objectId });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Object ${objectId} deleted successfully` }, null, 2),
          },
        ],
      };
    }

    case 'query': {
      if (!args.aql) {
        throw new McpError(ErrorCode.InvalidParams, 'AQL query is required for query operation');
      }

      // Get schema context if available (for better validation)
      let schemaContext;
      if (args.schemaId) {
        try {
          schemaContext = await getSchemaForValidation(args.schemaId, jiraClient);
        } catch (error) {
          console.warn('Could not load schema context for validation:', error);
        }
      }

      // Enhanced validation with schema context if available
      const validation = validateAqlQuery(args.aql, schemaContext);
      
      // If the query is invalid, return enhanced validation errors with suggestions
      if (!validation.isValid) {
        // Get example queries for the schema or object type
        const examples = args.schemaId 
          ? getExampleQueriesWithContext(args.schemaId, args.objectTypeId)
          : [];
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                error: 'Invalid AQL query',
                validation,
                suggestedFix: validation.fixedQuery,
                examples,
                operation,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
      
      // Use the fixed query if available, otherwise format the original
      const queryToUse = validation.fixedQuery || args.aql;
      const formattedAql = formatAqlForRequest(queryToUse);
      
      try {
        // Execute the query with the formatted AQL
        const queryResults = await assetsApi.objectsByAql({
          requestBody: {
            qlQuery: formattedAql  // Changed from 'aql' to 'qlQuery' to match API documentation
          },
          startAt,
          maxResults,
          includeAttributes,
          includeAttributesDeep,
          includeTypeAttributes,
          includeExtendedInfo
        });

        // Add metadata about the query
        const metadata = {
          _originalAql: args.aql,
          _formattedAql: formattedAql,
          _wasFixed: validation.fixedQuery ? true : false
        };
        
        // Apply simplification if requested
        const simplifiedResponse = args.simplifiedResponse !== undefined ? args.simplifiedResponse : true;
        const responseData = simplifiedResponse 
          ? simplifyQueryResults(queryResults, metadata)
          : { ...queryResults, ...metadata };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(responseData, null, 2),
            },
          ],
        };
      } catch (error) {
        // Enhanced error handling for AQL execution errors
        const { message, suggestions } = getContextualErrorMessage(error as Record<string, unknown>, formattedAql);
        
        // Get example queries for the schema or object type
        const examples = args.schemaId 
          ? getExampleQueriesWithContext(args.schemaId, args.objectTypeId)
          : [];
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Error executing AQL query',
                message,
                suggestions,
                examples,
                originalQuery: args.aql,
                formattedQuery: formattedAql
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new McpError(ErrorCode.InvalidParams, `Unsupported operation: ${operation}`);
    }
  } catch (error) {
    console.error('Error in object handler:', error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    // Use the new error handler with context
    return handleError(error, operation, {
      objectId,
      objectTypeId,
      name: args.name,
      attributes: args.attributes,
      startAt,
      maxResults,
      aql: args.aql,
      expand: args.expand,
      includeAttributes,
      includeAttributesDeep,
      includeTypeAttributes,
      includeExtendedInfo
    });
  }
}
