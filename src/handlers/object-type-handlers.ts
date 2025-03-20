import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from '../client/jira-client.js';
import { ObjectTypeOperation, ToolResponse } from '../types/index.js';
import { SchemaCacheManager } from '../utils/schema-cache-manager.js';

/**
 * Set up object type handlers for the MCP server
 * @param server The MCP server instance
 * @param jiraClient The Jira client instance
 * @param request The request object
 * @returns The response object
 */
export async function setupObjectTypeHandlers(
  server: Server,
  jiraClient: JiraClient,
  schemaCacheManager: SchemaCacheManager,
  request: any
): Promise<ToolResponse> {
  const { arguments: args } = request.params;
  const operation = args.operation as ObjectTypeOperation;

  // Normalize parameter names (support both camelCase and snake_case)
  const objectTypeId = args.objectTypeId || args.object_type_id;
  const schemaId = args.schemaId || args.schema_id;
  const startAt = args.startAt || args.start_at || 0;
  const maxResults = args.maxResults || args.max_results || 50;

  try {
    const assetsApi = await jiraClient.getAssetsApi();

    switch (operation) {
    case 'get': {
      if (!objectTypeId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object Type ID is required for get operation');
      }

      const objectType = await assetsApi.objectTypeFind({ id: objectTypeId });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(objectType, null, 2),
          },
        ],
      };
    }

    case 'list': {
      if (!schemaId) {
        throw new McpError(ErrorCode.InvalidParams, 'Schema ID is required for list operation');
      }

      // Use the correct parameter name (id instead of schemaId)
      const objectTypesList = await assetsApi.schemaFindAllObjectTypes({
        id: schemaId,
        excludeAbstract: false
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(objectTypesList, null, 2),
          },
        ],
      };
    }

    case 'create': {
      if (!schemaId) {
        throw new McpError(ErrorCode.InvalidParams, 'Schema ID is required for create operation');
      }

      if (!args.name) {
        throw new McpError(ErrorCode.InvalidParams, 'Name is required for create operation');
      }

      const newObjectType = await assetsApi.objectTypeCreate({
        objectTypeIn: {
          name: args.name,
          description: args.description || '',
          objectSchemaId: schemaId,
          icon: args.icon || 'object',
        },
      });

      // Refresh the schema cache for the affected schema
      await schemaCacheManager.refreshSchema(schemaId);
      console.error(`Schema cache refreshed for schema ${schemaId} after object type creation`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(newObjectType, null, 2),
          },
        ],
      };
    }

    case 'update': {
      if (!objectTypeId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object Type ID is required for update operation');
      }

      // First get the existing object type
      const existingObjectType = await assetsApi.objectTypeFind({ id: objectTypeId }) as {
          name: string;
          description: string;
          objectSchemaId: string;
          icon: string;
        };

      // Update with new values
      const updatedObjectType = await assetsApi.objectTypeUpdate({
        id: objectTypeId,
        objectTypeIn: {
          name: args.name || existingObjectType.name,
          description: args.description !== undefined ? args.description : existingObjectType.description,
          objectSchemaId: existingObjectType.objectSchemaId,
          icon: args.icon || existingObjectType.icon,
        },
      });

      // Refresh the schema cache for the affected schema
      await schemaCacheManager.refreshSchema(existingObjectType.objectSchemaId);
      console.error(`Schema cache refreshed for schema ${existingObjectType.objectSchemaId} after object type update`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(updatedObjectType, null, 2),
          },
        ],
      };
    }

    case 'delete': {
      if (!objectTypeId) {
        throw new McpError(ErrorCode.InvalidParams, 'Object Type ID is required for delete operation');
      }

      // Get the object type to find its schema ID before deleting
      const objectType = await assetsApi.objectTypeFind({ id: objectTypeId }) as {
        objectSchemaId: string;
      };
      
      await assetsApi.objectTypeDelete({ id: objectTypeId });

      // Refresh the schema cache for the affected schema
      await schemaCacheManager.refreshSchema(objectType.objectSchemaId);
      console.error(`Schema cache refreshed for schema ${objectType.objectSchemaId} after object type deletion`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Object Type ${objectTypeId} deleted successfully` }, null, 2),
          },
        ],
      };
    }

    default:
      throw new McpError(ErrorCode.InvalidParams, `Unsupported operation: ${operation}`);
    }
  } catch (error) {
    console.error('Error in object type handler:', error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            error: 'Failed to perform operation on object type',
            message: (error as Error).message,
            operation,
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
