import { ToolSchema } from '../types/index.js';

export const toolSchemas: Record<string, ToolSchema> = {
  // Schema Management API
  manage_jira_insight_schema: {
    name: 'manage_jira_insight_schema',
    description: 'Manage Jira Insights object schemas with CRUD operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['get', 'list', 'create', 'update', 'delete'],
          description: 'Operation to perform on the schema',
        },
        // Parameters for get, update, delete operations
        schemaId: {
          type: 'string',
          description: 'The ID of the schema. Required for get, update, and delete operations. Can also use snake_case "schema_id".',
        },
        // Parameters for create and update operations
        name: {
          type: 'string',
          description: 'Name of the schema. Required for create operation, optional for update.',
        },
        description: {
          type: 'string',
          description: 'Description of the schema. Optional for create/update.',
        },
        // Parameters for list operation
        startAt: {
          type: 'integer',
          description: 'Index of the first schema to return (0-based). Used for list operation. Can also use snake_case "start_at".',
          default: 0,
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of schemas to return. Used for list operation. Can also use snake_case "max_results".',
          default: 50,
        },
        // Common expansion options
        expand: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['objectTypes', 'attributes', 'statistics'],
          },
          description: 'Optional fields to include in the response',
        },
      },
      required: ['operation'],
    },
  },

  // Object Type Management API
  manage_jira_insight_object_type: {
    name: 'manage_jira_insight_object_type',
    description: 'Manage Jira Insights object types with CRUD operations',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['get', 'list', 'create', 'update', 'delete'],
          description: 'Operation to perform on the object type',
        },
        // Parameters for get, update, delete operations
        objectTypeId: {
          type: 'string',
          description: 'The ID of the object type. Required for get, update, and delete operations. Can also use snake_case "object_type_id".',
        },
        // Parameters for create and update operations
        schemaId: {
          type: 'string',
          description: 'The ID of the schema. Required for create operation. Can also use snake_case "schema_id".',
        },
        name: {
          type: 'string',
          description: 'Name of the object type. Required for create operation, optional for update.',
        },
        description: {
          type: 'string',
          description: 'Description of the object type. Optional for create/update.',
        },
        icon: {
          type: 'string',
          description: 'Icon for the object type. Optional for create/update.',
        },
        // Parameters for list operation
        startAt: {
          type: 'integer',
          description: 'Index of the first object type to return (0-based). Used for list operation. Can also use snake_case "start_at".',
          default: 0,
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of object types to return. Used for list operation. Can also use snake_case "max_results".',
          default: 50,
        },
        // Common expansion options
        expand: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['attributes', 'statistics', 'schema'],
          },
          description: 'Optional fields to include in the response',
        },
      },
      required: ['operation'],
    },
  },

  // Object Management API
  manage_jira_insight_object: {
    name: 'manage_jira_insight_object',
    description: 'Manage Jira Insights objects with CRUD operations and AQL queries',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['get', 'list', 'create', 'update', 'delete', 'query'],
          description: 'Operation to perform on the object',
        },
        // Parameters for get, update, delete operations
        objectId: {
          type: 'string',
          description: 'The ID of the object. Required for get, update, and delete operations. Can also use snake_case "object_id".',
        },
        // Parameters for create and update operations
        objectTypeId: {
          type: 'string',
          description: 'The ID of the object type. Required for create operation. Can also use snake_case "object_type_id".',
        },
        name: {
          type: 'string',
          description: 'Name of the object. Required for create operation, optional for update.',
        },
        attributes: {
          type: 'object',
          description: 'Attributes of the object as key-value pairs. Optional for create/update.',
        },
        // Parameters for list operation
        startAt: {
          type: 'integer',
          description: 'Index of the first object to return (0-based). Used for list and query operations. Can also use snake_case "start_at".',
          default: 0,
        },
        maxResults: {
          type: 'integer',
          description: 'Maximum number of objects to return. Used for list and query operations. Can also use snake_case "max_results".',
          default: 50,
        },
        // Parameters for query operation
        aql: {
          type: 'string',
          description: 'AQL query string. Required for query operation. Refer to the "jira-insights://aql-syntax" resource for AQL syntax documentation and examples.',
        },
        // Common expansion options
        expand: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['attributes', 'objectType', 'schema', 'history'],
          },
          description: 'Optional fields to include in the response',
        },
      },
      required: ['operation'],
    },
  },
};
