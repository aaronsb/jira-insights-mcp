import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from '../client/jira-client.js';
import { SchemaOperation, ToolResponse } from '../types/index.js';

/**
 * Set up schema handlers for the MCP server
 * @param server The MCP server instance
 * @param jiraClient The Jira client instance
 * @param request The request object
 * @returns The response object
 */
export async function setupSchemaHandlers(
  server: Server,
  jiraClient: JiraClient,
  request: any
): Promise<ToolResponse> {
  const { arguments: args } = request.params;
  const operation = args.operation as SchemaOperation;

  // Normalize parameter names (support both camelCase and snake_case)
  const schemaId = args.schemaId || args.schema_id;
  const startAt = args.startAt || args.start_at || 0;
  const maxResults = args.maxResults || args.max_results || 50;

  try {
    const assetsApi = await jiraClient.getAssetsApi();

    switch (operation) {
      case 'get': {
        if (!schemaId) {
          throw new McpError(ErrorCode.InvalidParams, 'Schema ID is required for get operation');
        }

        const schema = await assetsApi.getSchema({ id: schemaId });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schema, null, 2),
            },
          ],
        };
      }

      case 'list': {
        const schemaList = await assetsApi.schemaList({
          startAt,
          maxResults,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(schemaList, null, 2),
            },
          ],
        };
      }

      case 'create': {
        if (!args.name) {
          throw new McpError(ErrorCode.InvalidParams, 'Name is required for create operation');
        }

        const newSchema = await assetsApi.createSchema({
          objectSchemaIn: {
            name: args.name,
            description: args.description || '',
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newSchema, null, 2),
            },
          ],
        };
      }

      case 'update': {
        if (!schemaId) {
          throw new McpError(ErrorCode.InvalidParams, 'Schema ID is required for update operation');
        }

        // First get the existing schema
        const existingSchema = await assetsApi.getSchema({ id: schemaId }) as {
          name: string;
          description: string;
        };

        // Update with new values
        const updatedSchema = await assetsApi.updateSchema({
          id: schemaId,
          objectSchemaIn: {
            name: args.name || existingSchema.name,
            description: args.description !== undefined ? args.description : existingSchema.description,
          },
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(updatedSchema, null, 2),
            },
          ],
        };
      }

      case 'delete': {
        if (!schemaId) {
          throw new McpError(ErrorCode.InvalidParams, 'Schema ID is required for delete operation');
        }

        await assetsApi.deleteSchema({ id: schemaId });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, message: `Schema ${schemaId} deleted successfully` }, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.InvalidParams, `Unsupported operation: ${operation}`);
    }
  } catch (error) {
    console.error('Error in schema handler:', error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            error: 'Failed to perform operation on schema',
            message: (error as Error).message,
            operation,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
