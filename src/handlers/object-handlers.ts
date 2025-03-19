import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from '../client/jira-client.js';
import { ObjectOperation, ToolResponse } from '../types/index.js';

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

        const object = await assetsApi.getObject({ id: objectId });
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

        const objectsList = await assetsApi.getObjects({
          objectTypeId,
          startAt,
          maxResults,
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

        // Prepare attributes
        const attributes = args.attributes || {};
        const attributeValues = Object.entries(attributes).map(([key, value]) => ({
          objectTypeAttributeId: key,
          objectAttributeValues: [{ value }],
        }));

        const newObject = await assetsApi.createObject({
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
        const existingObject = await assetsApi.getObject({ id: objectId }) as {
          name: string;
          objectTypeId: string;
        };

        // Prepare attributes
        const attributes = args.attributes || {};
        const attributeValues = Object.entries(attributes).map(([key, value]) => ({
          objectTypeAttributeId: key,
          objectAttributeValues: [{ value }],
        }));

        // Update with new values
        const updatedObject = await assetsApi.updateObject({
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

        await assetsApi.deleteObject({ id: objectId });

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

        const queryResults = await assetsApi.findObjectsByAql({
          objectAQLParams: {
            aql: args.aql,
            startAt,
            maxResults,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(queryResults, null, 2),
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
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            error: 'Failed to perform operation on object',
            message: (error as Error).message,
            operation,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
