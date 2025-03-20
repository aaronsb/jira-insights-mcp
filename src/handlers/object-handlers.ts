import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from '../client/jira-client.js';
import { ObjectOperation, ToolResponse } from '../types/index.js';
import { formatAttributes } from '../utils/attribute-utils.js';
import { validateAqlQuery, formatAqlForRequest } from '../utils/aql-utils.js';
import { handleError } from '../utils/error-handler.js';

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

  try {
    const assetsApi = await jiraClient.getAssetsApi();

    switch (operation) {
    case 'get': {
      if (!objectId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object ID is required for get operation');
      }

      const object = await assetsApi.objectFind({ id: objectId });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(object, null, 2),
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
          aql: `objectType = ${objectTypeId}`
        },
        startAt,
        maxResults,
        includeAttributes: true
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(objectsList, null, 2),
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(newObject, null, 2),
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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(updatedObject, null, 2),
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

      // Validate the AQL query
      const validation = validateAqlQuery(args.aql);
      
      // If the query is invalid, return validation errors
      if (!validation.isValid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ 
                error: 'Invalid AQL query',
                validation,
                operation,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
      
      // Format the AQL query for the API
      const formattedAql = formatAqlForRequest(args.aql);
      
      // Execute the query with the formatted AQL
      const queryResults = await assetsApi.objectsByAql({
        requestBody: {
          aql: formattedAql
        },
        startAt,
        maxResults,
        includeAttributes: true
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...queryResults,
              _originalAql: args.aql,
              _formattedAql: formattedAql
            }, null, 2),
          },
        ],
      };
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
      expand: args.expand
    });
  }
}
