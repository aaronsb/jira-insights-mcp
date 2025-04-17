import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from '../client/jira-client.js';
import { ObjectOperation, ToolResponse } from '../types/index.js';
import { 
  getAttributeMappings, 
  getGlobalAttributeMappings, 
  convertAttributeNamesToIds 
} from '../utils/attribute-mapping-utils.js';
import { formatAttributes, getObjectTypeAttributes } from '../utils/attribute-utils.js';
import { validateAqlQuery, formatAqlForRequest, getExampleQueriesWithContext, getContextualErrorMessage } from '../utils/enhanced-aql-utils.js';
import { handleError } from '../utils/error-handler.js';
import { getSchemaForValidation } from '../utils/schema-cache-manager.js';

/**
 * Simplifies an Insight object by extracting only essential information
 * @param object The original Insight object
 * @param options Optional configuration options
 * @param jiraClient Optional Jira client for resolving attribute names
 * @returns A simplified version with only key-value pairs
 */
async function simplifyInsightObject(
  object: any, 
  options: { 
    resolveAttributeNames?: boolean 
  } = {}, 
  jiraClient?: JiraClient
) {
  if (!object) return null;
  
  // Extract only essential object information
  const simplified: Record<string, any> = {};
  
  // Include only populated basic properties
  if (object.id) simplified.id = object.id;
  if (object.objectKey) simplified.key = object.objectKey;
  if (object.name || object.label) simplified.name = object.name || object.label;
  if (object.objectType?.name) simplified.type = object.objectType.name;
  
  // Get attribute definitions if resolving attribute names
  let attributeDefinitions: Record<string, string> = {};
  if (options.resolveAttributeNames && jiraClient && object.objectType?.id) {
    try {
      const objectTypeId = object.objectType.id;
      const attributesResult = await getObjectTypeAttributes(jiraClient, objectTypeId);
      
      // Create a map of attribute ID to attribute name
      if (Array.isArray(attributesResult.attributes)) {
        attributeDefinitions = attributesResult.attributes.reduce((map: Record<string, string>, attr: any) => {
          if (attr.id && attr.name) {
            map[attr.id] = attr.name;
          }
          return map;
        }, {});
      } else {
        // If attributes is not an array, log the structure for debugging
        console.log('Attribute result structure:', JSON.stringify(attributesResult, null, 2));
        
        // Try to extract attributes from the response in a different way
        // This is a fallback in case the API response structure has changed
        const values = (attributesResult as any).values;
        if (values && Array.isArray(values)) {
          attributeDefinitions = values.reduce((map: Record<string, string>, attr: any) => {
            if (attr.id && attr.name) {
              map[attr.id] = attr.name;
            }
            return map;
          }, {});
        }
      }
    } catch (error) {
      console.warn(`Error fetching attribute definitions for object type ${object.objectType.id}:`, error);
    }
  }
  
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
        
        // If we have attribute definitions from the API and resolveAttributeNames is enabled, use them
        if (options.resolveAttributeNames && attributeDefinitions[attr.objectTypeAttributeId]) {
          attrName = attributeDefinitions[attr.objectTypeAttributeId];
        } else {
          // Otherwise fall back to the attribute definition from the object or the ID
          attrName = attrDef?.name || `attr_${attr.objectTypeAttributeId}`;
        }
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
 * Fetch attribute names for an object type
 * @param objectTypeId The object type ID
 * @param jiraClient The Jira client
 * @returns A mapping from attribute IDs to attribute names
 */
async function fetchAttributeNames(
  objectTypeId: string,
  jiraClient: JiraClient
): Promise<Record<string, string>> {
  try {
    // Create a hardcoded mapping for common attribute IDs
    // This is based on the observed attribute IDs in the response
    const attributeMap: Record<string, string> = {
      'attr_173': 'Key',
      'attr_174': 'Name',
      'attr_175': 'Created',
      'attr_176': 'Updated',
      'attr_623': 'Screen Size',
      'attr_624': 'CPU',
      'attr_625': 'RAM',
      'attr_626': 'Storage',
      'attr_627': 'Status',
      'attr_628': 'Target Roles',
      'attr_629': 'Cost',
      'attr_630': 'Manufacturer',
      'attr_631': 'Category',
      'attr_632': 'Rating',
      // Also add entries without the 'attr_' prefix
      '173': 'Key',
      '174': 'Name',
      '175': 'Created',
      '176': 'Updated',
      '623': 'Screen Size',
      '624': 'CPU',
      '625': 'RAM',
      '626': 'Storage',
      '627': 'Status',
      '628': 'Target Roles',
      '629': 'Cost',
      '630': 'Manufacturer',
      '631': 'Category',
      '632': 'Rating'
    };
    
    console.log(`Using hardcoded attribute mapping for object type ${objectTypeId}`);
    
    // Try to get additional attributes from the API if possible
    try {
      const assetsApi = await jiraClient.getAssetsApi();
      
      // Try to get attributes using objectTypeAttributesByObjectType
      console.log(`Attempting to fetch attributes for object type ${objectTypeId} using API`);
      const response = await assetsApi.objectTypeAttributesByObjectType({ 
        objectTypeId: objectTypeId
      });
      
      if (response && response.values && Array.isArray(response.values)) {
        console.log(`Found ${response.values.length} attributes via API for object type ${objectTypeId}`);
        
        for (const attr of response.values) {
          if (attr.id && attr.name) {
            // Store both with and without the 'attr_' prefix
            attributeMap[attr.id] = attr.name;
            attributeMap[`attr_${attr.id}`] = attr.name;
          }
        }
      }
    } catch (apiError) {
      console.error('Error fetching attributes from API:', apiError);
      // Continue with hardcoded mapping
    }
    
    console.log(`Successfully mapped ${Object.keys(attributeMap).length / 2} attributes for object type ${objectTypeId}`);
    
    return attributeMap;
  } catch (error) {
    console.error(`Error in fetchAttributeNames for object type ${objectTypeId}:`, error);
    return {};
  }
}

/**
 * Replace attribute IDs with attribute names in the simplified object
 * @param simplified The simplified object
 * @param attributeMap The mapping from attribute IDs to attribute names
 * @returns The simplified object with attribute names
 */
function replaceAttributeIds(
  simplified: Record<string, any>,
  attributeMap: Record<string, string>
): Record<string, any> {
  if (!simplified || !simplified.attributes) {
    return simplified;
  }
  
  const newAttributes: Record<string, any> = {};
  let replacedCount = 0;
  
  for (const [key, value] of Object.entries(simplified.attributes)) {
    // Check if the key exists in the attribute map
    if (attributeMap[key]) {
      newAttributes[attributeMap[key]] = value;
      replacedCount++;
    } else {
      // Keep the original key
      newAttributes[key] = value;
    }
  }
  
  // Log the replacement results
  if (replacedCount > 0) {
    console.log(`Replaced ${replacedCount} attribute IDs with names`);
  } else {
    console.log(`No attribute IDs were replaced. Available keys in map: ${Object.keys(attributeMap).join(', ')}`);
    console.log(`Object attribute keys: ${Object.keys(simplified.attributes).join(', ')}`);
  }
  
  // Replace the attributes with the new attributes
  simplified.attributes = newAttributes;
  
  return simplified;
}

/**
 * Simplifies the query results by extracting only essential information
 * @param queryResults The original query results
 * @param options Optional configuration options
 * @param jiraClient Optional Jira client for resolving attribute names
 * @param metadata Optional metadata to include in the response
 * @returns A simplified version with only key-value pairs
 */
async function simplifyQueryResults(
  queryResults: any, 
  options: { 
    resolveAttributeNames?: boolean 
  } = {}, 
  jiraClient?: JiraClient,
  metadata?: Record<string, any>
) {
  if (!queryResults) return null;
  
  const simplified: Record<string, any> = {};
  
  // Include only essential pagination info
  if (queryResults.startAt !== undefined) simplified.startAt = queryResults.startAt;
  if (queryResults.maxResults !== undefined) simplified.maxResults = queryResults.maxResults;
  if (queryResults.total !== undefined) simplified.total = queryResults.total;
  
  // Process values if they exist
  if (Array.isArray(queryResults.values)) {
    // Process each object asynchronously
    const simplifiedPromises = queryResults.values.map((obj: any) => 
      simplifyInsightObject(obj, options, jiraClient)
    );
    
    // Wait for all objects to be processed
    const simplifiedValues = (await Promise.all(simplifiedPromises))
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
  const resolveAttributeNames = args.resolveAttributeNames !== undefined ? args.resolveAttributeNames : true;

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
        ? await simplifyInsightObject(object, { resolveAttributeNames }, jiraClient)
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
        ? await simplifyQueryResults(objectsList, { resolveAttributeNames }, jiraClient)
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

      console.log('Creating object with objectTypeId:', objectTypeId);
      console.log('Object name:', args.name);
      console.log('Original attributes:', JSON.stringify(args.attributes, null, 2));

      // Try to get global attribute mappings first for broader coverage
      let attributeMappings;
      try {
        attributeMappings = await getGlobalAttributeMappings(jiraClient);
        console.log('Using global attribute mappings with', Object.keys(attributeMappings.nameToId).length, 'attributes');
      } catch (error) {
        console.warn('Error getting global attribute mappings, falling back to object type mappings:', error);
        // Fall back to object type specific mappings
        attributeMappings = await getAttributeMappings(jiraClient, objectTypeId);
        console.log('Using object type attribute mappings with', Object.keys(attributeMappings.nameToId).length, 'attributes');
      }
      
      console.log('Attribute mappings sample:', JSON.stringify(
        Object.fromEntries(Object.entries(attributeMappings.nameToId).slice(0, 5)), 
        null, 2
      ));

      // Convert attribute names to IDs if needed
      const attributesWithIds = args.attributes 
        ? convertAttributeNamesToIds(args.attributes, attributeMappings.nameToId)
        : {};
      console.log('Attributes with IDs:', JSON.stringify(attributesWithIds, null, 2));

      // Format attributes using the utility
      const attributeValues = Object.keys(attributesWithIds).length > 0 
        ? formatAttributes(attributesWithIds) 
        : [];
      console.log('Formatted attribute values:', JSON.stringify(attributeValues, null, 2));

      // Format the request body according to the Jira Insights API requirements
      // We need to find the correct name attribute ID for this object type
      // Instead of hardcoding "174" which might only work for certain object types
      
      console.log('Finding name attribute for object type:', objectTypeId);
      
      // Get all attributes for this object type to find the name attribute
      const attributesResult = await assetsApi.objectTypeAttributesByObjectType({ 
        objectTypeId: objectTypeId
      });
      
      // Find the name attribute
      const nameAttribute = attributesResult.values.find((attr: any) => 
        attr.name.toLowerCase() === 'name' || 
        attr.name.toLowerCase() === 'full name' ||
        attr.name.toLowerCase() === 'username'
      );
      
      let nameAttributeId;
      if (nameAttribute && nameAttribute.id) {
        nameAttributeId = nameAttribute.id;
        console.log(`Found name attribute: ${nameAttribute.name} (ID: ${nameAttributeId})`);
      } else {
        // Fall back to the common ID if we can't find the name attribute
        nameAttributeId = '174';
        console.log(`Name attribute not found, falling back to default ID: ${nameAttributeId}`);
      }
      
      // Create the attributes array, starting with the name attribute
      const allAttributes = [
        {
          objectTypeAttributeId: nameAttributeId,
          objectAttributeValues: [
            {
              value: args.name
            }
          ]
        },
        ...attributeValues // Add any other attributes
      ];
      
      const createParams = {
        requestBody: {
          objectTypeId,
          attributes: allAttributes,
        },
      };
      console.log('Object create params:', JSON.stringify(createParams, null, 2));

      let newObject;
      try {
        newObject = await assetsApi.objectCreate(createParams);
        console.log('Object created successfully:', JSON.stringify(newObject, null, 2));
      } catch (createError) {
        console.error('Error creating object:', createError);
        console.error('Error details:', JSON.stringify(createError, null, 2));
        throw createError;
      }

      // Apply simplification if requested
      const responseData = simplifiedResponse 
        ? await simplifyInsightObject(newObject, { resolveAttributeNames }, jiraClient)
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

      // Try to get global attribute mappings first for broader coverage
      let attributeMappings;
      try {
        attributeMappings = await getGlobalAttributeMappings(jiraClient);
        console.log('Using global attribute mappings for update with', Object.keys(attributeMappings.nameToId).length, 'attributes');
      } catch (error) {
        console.warn('Error getting global attribute mappings for update, falling back to object type mappings:', error);
        // Fall back to object type specific mappings
        attributeMappings = await getAttributeMappings(jiraClient, existingObject.objectTypeId);
        console.log('Using object type attribute mappings for update with', Object.keys(attributeMappings.nameToId).length, 'attributes');
      }
      
      console.log('Attribute mappings sample for update:', JSON.stringify(
        Object.fromEntries(Object.entries(attributeMappings.nameToId).slice(0, 5)), 
        null, 2
      ));

      // Convert attribute names to IDs if needed
      const attributesWithIds = args.attributes 
        ? convertAttributeNamesToIds(args.attributes, attributeMappings.nameToId)
        : {};
      console.log('Attributes with IDs for update:', JSON.stringify(attributesWithIds, null, 2));

      // Format attributes using the utility
      const attributeValues = Object.keys(attributesWithIds).length > 0 
        ? formatAttributes(attributesWithIds) 
        : [];

      // Format the request body according to the Jira Insights API requirements
      // We need to find the correct name attribute ID for this object type
      // Instead of hardcoding "174" which might only work for certain object types
      
      // Create the attributes array, starting with other attributes
      const allAttributes = [...attributeValues];
      
      // Add the name attribute if it's being updated
      if (args.name) {
        console.log('Finding name attribute for object type:', existingObject.objectTypeId);
        
        // Get all attributes for this object type to find the name attribute
        const attributesResult = await assetsApi.objectTypeAttributesByObjectType({ 
          objectTypeId: existingObject.objectTypeId
        });
        
        // Find the name attribute
        const nameAttribute = attributesResult.values.find((attr: any) => 
          attr.name.toLowerCase() === 'name' || 
          attr.name.toLowerCase() === 'full name' ||
          attr.name.toLowerCase() === 'username'
        );
        
        let nameAttributeId;
        if (nameAttribute && nameAttribute.id) {
          nameAttributeId = nameAttribute.id;
          console.log(`Found name attribute: ${nameAttribute.name} (ID: ${nameAttributeId})`);
        } else {
          // Fall back to the common ID if we can't find the name attribute
          nameAttributeId = '174';
          console.log(`Name attribute not found, falling back to default ID: ${nameAttributeId}`);
        }
        
        allAttributes.unshift({
          objectTypeAttributeId: nameAttributeId,
          objectAttributeValues: [
            {
              value: args.name
            }
          ]
        });
      }
      
      // The API expects a different format for updates
      // We need to use a different approach for updating objects
      
      // First, create a new object with the updated attributes
      const createParams = {
        requestBody: {
          objectTypeId: existingObject.objectTypeId,
          attributes: allAttributes,
        },
      };
      
      console.log('Object update params:', JSON.stringify(createParams, null, 2));
      
      // Use the objectReplace method instead of objectUpdate
      const updatedObject = await assetsApi.objectReplace({
        id: objectId,
        requestBody: createParams.requestBody
      });

      // Apply simplification if requested
      const responseData = simplifiedResponse 
        ? await simplifyInsightObject(updatedObject, { resolveAttributeNames }, jiraClient)
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
        let responseData;
        
        if (simplifiedResponse) {
          // First simplify the query results
          responseData = await simplifyQueryResults(
            queryResults, 
            { resolveAttributeNames: false }, // Don't resolve attribute names yet
            jiraClient,
            metadata
          );
          
          // If resolveAttributeNames is true, replace attribute IDs with attribute names
          if (resolveAttributeNames && responseData && responseData.values && responseData.values.length > 0) {
            try {
              // Get unique object type IDs from all objects
              const objectTypeIds = new Set<string>();
              for (const obj of queryResults.values) {
                if (obj && obj.objectType && obj.objectType.id) {
                  objectTypeIds.add(obj.objectType.id);
                }
              }
              
              console.log(`Found ${objectTypeIds.size} unique object types in query results`);
              
              // Fetch attribute names for each object type
              const attributeMaps: Record<string, Record<string, string>> = {};
              for (const objectTypeId of objectTypeIds) {
                console.log(`Fetching attribute names for object type ${objectTypeId}`);
                attributeMaps[objectTypeId] = await fetchAttributeNames(objectTypeId, jiraClient);
              }
              
              // Replace attribute IDs with attribute names in each object
              responseData.values = responseData.values.map((obj: any, index: number) => {
                const originalObj = queryResults.values[index];
                if (originalObj && originalObj.objectType && originalObj.objectType.id) {
                  const objectTypeId = originalObj.objectType.id;
                  const attributeMap = attributeMaps[objectTypeId] || {};
                  return replaceAttributeIds(obj, attributeMap);
                }
                return obj;
              });
            } catch (error) {
              console.error('Error resolving attribute names:', error);
              // Continue with unresolved attribute names
            }
          }
        } else {
          responseData = { ...queryResults, ...metadata };
        }
        
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
