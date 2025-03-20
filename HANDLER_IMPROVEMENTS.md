# Handler File Improvements

This document outlines the specific changes needed for each handler file to implement the error handling and other enhancements.

## 1. Schema Handlers (`src/handlers/schema-handlers.ts`)

### Add Error Handler Import

```typescript
import { handleError } from '../utils/error-handler.js';
```

### Update Error Handling in Each Operation

Replace the current catch block with the enhanced error handling:

```typescript
try {
  // Existing operation code
} catch (error) {
  console.error('Error in schema handler:', error);
  
  if (error instanceof McpError) {
    throw error;
  }
  
  // Use the new error handler with context
  return handleError(error, operation, {
    schemaId,
    name: args.name,
    description: args.description,
    startAt,
    maxResults,
    expand: args.expand
  });
}
```

## 2. Object Type Handlers (`src/handlers/object-type-handlers.ts`)

### Add Imports

```typescript
import { handleError } from '../utils/error-handler.js';
import { getObjectTypeAttributes } from '../utils/attribute-utils.js';
```

### Update Error Handling in Each Operation

Replace the current catch block with the enhanced error handling:

```typescript
try {
  // Existing operation code
} catch (error) {
  console.error('Error in object type handler:', error);
  
  if (error instanceof McpError) {
    throw error;
  }
  
  // Use the new error handler with context
  return handleError(error, operation, {
    objectTypeId,
    schemaId,
    name: args.name,
    description: args.description,
    icon: args.icon,
    startAt,
    maxResults,
    expand: args.expand
  });
}
```

### Add Attribute Handling for Get Operation

Enhance the 'get' operation to include attributes:

```typescript
case 'get': {
  if (!objectTypeId) {
    throw new McpError(ErrorCode.InvalidParams, 'Object Type ID is required for get operation');
  }

  const objectType = await assetsApi.objectTypeFind({ id: objectTypeId });
  
  // Check if attributes should be included
  if (args.expand && args.expand.includes('attributes')) {
    try {
      // Get attributes using the new utility
      const attributesResult = await getObjectTypeAttributes(jiraClient, objectTypeId);
      
      // Add attributes to the response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...objectType,
              attributes: attributesResult.attributes,
              _attributesCount: attributesResult.count,
              _attributesCached: attributesResult._cached,
              _attributesCachedAt: attributesResult._cachedAt
            }, null, 2),
          },
        ],
      };
    } catch (attrError) {
      console.error(`Error fetching attributes for object type ${objectTypeId}:`, attrError);
      
      // Return the object type without attributes
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ...objectType,
              _attributesError: 'Failed to fetch attributes',
              _attributesErrorMessage: (attrError as Error).message
            }, null, 2),
          },
        ],
      };
    }
  }
  
  // Return the object type without attributes
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(objectType, null, 2),
      },
    ],
  };
}
```

## 3. Object Handlers (`src/handlers/object-handlers.ts`)

### Add Imports

```typescript
import { handleError } from '../utils/error-handler.js';
import { validateAqlQuery, formatAqlForRequest } from '../utils/aql-utils.js';
import { formatAttributes } from '../utils/attribute-utils.js';
```

### Update Error Handling in Each Operation

Replace the current catch block with the enhanced error handling:

```typescript
try {
  // Existing operation code
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
```

### Enhance the Query Operation with Validation

```typescript
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
```

### Update Create and Update Operations to Use formatAttributes

```typescript
// In create operation
const newObject = await assetsApi.objectCreate({
  objectIn: {
    name: args.name,
    objectTypeId,
    attributes: args.attributes ? formatAttributes(args.attributes) : [],
  },
});

// In update operation
const updatedObject = await assetsApi.objectUpdate({
  id: objectId,
  objectIn: {
    name: args.name || existingObject.name,
    objectTypeId: existingObject.objectTypeId,
    attributes: args.attributes ? formatAttributes(args.attributes) : undefined,
  },
});
```

## 4. Resource Handlers (`src/handlers/resource-handlers.ts`)

### Add AQL Documentation Resource

Enhance the AQL syntax resource to include more detailed examples and error handling guidance:

```typescript
// AQL syntax resource
if (uri === 'jira-insights://aql-syntax') {
  return {
    contents: [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            title: 'Assets Query Language (AQL) Syntax Guide',
            description: 'AQL is a powerful query language used in Jira Insights to search, filter, and retrieve objects.',
            basicSyntax: {
              pattern: '<attribute> <operator> <value/function>',
              example: 'Owner = "Ted Anderson"',
              description: 'Returns all objects where the Owner is Ted Anderson'
            },
            guidelines: [
              'AQL is not case-sensitive',
              'Values with spaces must be enclosed in quotes: "Ted Anderson"',
              'Escape quotes with backslashes: 15\\" Screen',
              'Attribute names must exist in your schema'
            ],
            // ... existing content ...
            
            // Add new section for common errors and solutions
            commonErrors: [
              {
                error: 'Validation error',
                cause: 'Missing quotes around values with spaces',
                example: 'Name = John Doe',
                solution: 'Add quotes: Name = "John Doe"'
              },
              {
                error: 'Validation error',
                cause: 'Using lowercase logical operators',
                example: 'objectType = "Server" and Status = "Active"',
                solution: 'Use uppercase: objectType = "Server" AND Status = "Active"'
              },
              {
                error: 'Object type not found',
                cause: 'Referencing a non-existent object type',
                example: 'objectType = "NonExistentType"',
                solution: 'Check available object types in your schema'
              },
              {
                error: 'Attribute not found',
                cause: 'Referencing a non-existent attribute',
                example: 'NonExistentAttribute = "Value"',
                solution: 'Check available attributes for the object type'
              }
            ],
            
            // Add new section for query building tips
            queryBuildingTips: [
              'Start with simple queries and add complexity gradually',
              'Test each condition separately before combining them',
              'Use objectType = "X" as the first condition to narrow down results',
              'When using referenced objects, ensure the reference chain exists',
              'For complex queries, break them down into smaller parts'
            ]
          },
          null,
          2
        ),
      },
    ],
  };
}
```

### Add New Resource for AQL Examples by Schema

```typescript
// AQL examples by schema resource
const aqlExamplesBySchemaMatch = uri.match(/^jira-insights:\/\/schemas\/([^/]+)\/aql-examples$/);
if (aqlExamplesBySchemaMatch) {
  const schemaId = decodeURIComponent(aqlExamplesBySchemaMatch[1]);
  
  try {
    // Wait for schema cache to be initialized
    await schemaCacheManager.waitForInitialization();
    
    const schema = schemaCacheManager.getSchema(schemaId);
    
    if (!schema) {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                error: `Schema not found: ${schemaId}`,
              },
              null,
              2
            ),
          },
        ],
      };
    }
    
    // Get object types for this schema
    const objectTypes = schema.objectTypes || [];
    
    // Generate examples based on object types
    const examples = [];
    
    // Add basic examples for each object type
    for (const objectType of objectTypes) {
      examples.push({
        description: `Find all ${objectType.name} objects`,
        aql: `objectType = "${objectType.name}"`,
        complexity: 'basic'
      });
    }
    
    // Add some more complex examples if there are object types
    if (objectTypes.length > 0) {
      examples.push({
        description: 'Find objects with a specific status',
        aql: `objectType = "${objectTypes[0].name}" AND Status = "Active"`,
        complexity: 'intermediate'
      });
      
      examples.push({
        description: 'Find objects with a specific attribute containing text',
        aql: `objectType = "${objectTypes[0].name}" AND Name like "Test"`,
        complexity: 'intermediate'
      });
      
      examples.push({
        description: 'Find objects with multiple conditions',
        aql: `objectType = "${objectTypes[0].name}" AND Status = "Active" AND Created > now(-30d)`,
        complexity: 'advanced'
      });
    }
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              schemaId,
              schemaName: schema.name,
              examples,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    console.error(`Error generating AQL examples for schema ${schemaId}:`, error);
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              error: `Failed to generate AQL examples for schema ${schemaId}`,
              message: (error as Error).message,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
```

### Add New Resource for Object Type Templates

```typescript
// Object type template resource
const objectTypeTemplateMatch = uri.match(/^jira-insights:\/\/object-types\/([^/]+)\/template$/);
if (objectTypeTemplateMatch) {
  const objectTypeId = decodeURIComponent(objectTypeTemplateMatch[1]);
  
  try {
    const assetsApi = await jiraClient.getAssetsApi();
    const objectType = await assetsApi.objectTypeFind({ id: objectTypeId }) as {
      id: string;
      name: string;
      description: string;
      objectSchemaId: string;
    };
    
    // Get attributes for this object type
    const attributesList = await assetsApi.objectTypeFindAllAttributes({ 
      id: objectTypeId,
      onlyValueEditable: false,
      orderByName: false,
      query: '""',
      includeValuesExist: false,
      excludeParentAttributes: false,
      includeChildren: false,
      orderByRequired: false
    });
    
    const attributes = attributesList.values || [];
    
    // Generate template object
    const template: Record<string, any> = {
      name: `[${objectType.name} Name]`,
    };
    
    // Generate template values for each attribute
    attributes.forEach((attr: any) => {
      let placeholder;
      
      switch(attr.type) {
        case 'TEXT':
          placeholder = `[${attr.name} text]`;
          break;
        case 'INTEGER':
          placeholder = 0;
          break;
        case 'FLOAT':
          placeholder = 0.0;
          break;
        case 'DATE':
          placeholder = new Date().toISOString().split('T')[0];
          break;
        case 'DATETIME':
          placeholder = new Date().toISOString();
          break;
        case 'BOOLEAN':
          placeholder = false;
          break;
        case 'REFERENCE':
          placeholder = {
            objectTypeId: attr.referenceObjectTypeId,
            objectMappingIQL: `[Referenced ${attr.name} AQL query]`
          };
          break;
        default:
          placeholder = `[${attr.name}]`;
      }
      
      template[attr.name] = placeholder;
    });
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              objectTypeId,
              objectTypeName: objectType.name,
              schemaId: objectType.objectSchemaId,
              template,
              _attributesCount: attributes.length,
              _generatedAt: new Date().toISOString(),
              usage: {
                description: 'This template provides a starting point for creating objects of this type.',
                notes: [
                  'Replace placeholder values with actual data',
                  'Required attributes must be provided',
                  'For reference attributes, provide a valid AQL query or object ID'
                ]
              }
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    console.error(`Error generating template for object type ${objectTypeId}:`, error);
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              error: `Failed to generate template for object type ${objectTypeId}`,
              message: (error as Error).message,
            },
            null,
            2
          ),
        },
      ],
    };
  }
}
```

## 5. Update Resource Templates List

Update the `listResourceTemplates` function to include the new resource templates:

```typescript
const listResourceTemplates = async () => {
  return {
    resourceTemplates: [
      {
        uriTemplate: 'jira-insights://schemas/{schemaId}/overview',
        name: 'Schema Overview',
        mimeType: 'application/json',
        description: 'Overview of a specific schema including metadata and statistics',
      },
      {
        uriTemplate: 'jira-insights://object-types/{objectTypeId}/overview',
        name: 'Object Type Overview',
        mimeType: 'application/json',
        description: 'Overview of a specific object type including attributes and statistics',
      },
      // Add new resource templates
      {
        uriTemplate: 'jira-insights://schemas/{schemaId}/aql-examples',
        name: 'Schema AQL Examples',
        mimeType: 'application/json',
        description: 'Example AQL queries for a specific schema',
      },
      {
        uriTemplate: 'jira-insights://object-types/{objectTypeId}/template',
        name: 'Object Type Template',
        mimeType: 'application/json',
        description: 'Template for creating objects of a specific type',
      },
    ],
  };
};
