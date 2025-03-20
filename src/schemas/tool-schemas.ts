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
          description: `AQL query string. Required for query operation. 

IMPORTANT: For comprehensive AQL documentation, refer to the "jira-insights://aql-syntax" resource using the access_mcp_resource tool. This resource contains detailed syntax guides, examples, and best practices.

Guide to Constructing Better Jira Insight AQL Queries:

Understanding AQL Fundamentals:
- Object Type Case Sensitivity: Use exact case matching for object type names (e.g., ObjectType = "Supported laptops" not objectType = "Supported laptops").
- String Values in Quotes: Always enclose string values in double quotes, especially values containing spaces (e.g., Name = "MacBook Pro" not Name = MacBook Pro).
- Attribute References: Reference attributes directly by their name, not by a derived field name (e.g., use Name not name).
- LIKE Operator Usage: Use the LIKE operator for partial string matching, but be aware it may be case-sensitive.

Effective Query Construction:
- Start Simple: Begin with the most basic query to validate object existence before adding complex filters:
  ObjectType = "Supported laptops"
- Examine Response Objects: Study the first responses to understand available attribute names and formats before using them in filters.
- Keyword Strategy: When searching for specific items, try multiple potential keywords (e.g., "ThinkPad", "Lenovo", "Carbon") rather than just exclusion logic.
- Incremental Complexity: Add filter conditions incrementally, testing after each addition rather than constructing complex queries in one step.

Managing Complex Queries:
- AND/OR Operators: Structure complex conditions carefully with proper parentheses:
  ObjectType = "Supported laptops" AND (Name LIKE "ThinkPad" OR Name LIKE "Lenovo")
- NOT Operators: Use NOT sparingly and with proper syntax:
  ObjectType = "Supported laptops" AND NOT Name LIKE "MacBook"
- Reference Object Queries: For filtering on related objects, use their object key as a reference:
  ObjectType = "Supported laptops" AND Manufacturer = "PPL-231"
- Pagination Awareness: For large result sets, utilize the startAt and maxResults parameters to get complete data.`,
        },
        // Schema-aware validation parameters
        schemaId: {
          type: 'string',
          description: 'The ID of the schema to use for enhanced validation. When provided, the query will be validated against the schema structure, providing better error messages and suggestions.',
        },
        // Attribute inclusion options
        includeAttributes: {
          type: 'boolean',
          description: 'Should the objects attributes be included in the response. If this parameter is false only the information on the object will be returned and the object attributes will not be present.',
          default: true,
        },
        includeAttributesDeep: {
          type: 'integer',
          description: 'How many levels of attributes should be included. E.g. consider an object A that has a reference to object B that has a reference to object C. If object A is included in the response and includeAttributesDeep=1 object A\'s reference to object B will be included in the attributes of object A but object B\'s reference to object C will not be included. However if the includeAttributesDeep=2 then object B\'s reference to object C will be included in object B\'s attributes.',
          default: 1,
        },
        includeTypeAttributes: {
          type: 'boolean',
          description: 'Should the response include the object type attribute definition for each attribute that is returned with the objects.',
          default: false,
        },
        includeExtendedInfo: {
          type: 'boolean',
          description: 'Include information about open Jira issues. Should each object have information if open tickets are connected to the object?',
          default: false,
        },
        // Response format options
        simplifiedResponse: {
          type: 'boolean',
          description: 'Return a simplified response with only essential key-value pairs, excluding detailed metadata, references, and type definitions. Useful for reducing response size and improving readability.',
          default: true,
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
