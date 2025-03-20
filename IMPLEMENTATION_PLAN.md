# Jira Insights MCP Implementation Plan

This document provides a detailed implementation plan for the high-priority improvements to the Jira Insights MCP.

## 1. Enhanced Error Handling

### Create Error Handling Utility (`src/utils/error-handler.ts`)

```typescript
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ToolResponse } from '../types/index.js';

// Common error types for standardization
export enum JiraInsightsErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  SCHEMA_ERROR = 'SCHEMA_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
}

// Error handling utility
export function handleError(
  error: any,
  operation: string,
  context?: Record<string, any>
): ToolResponse {
  console.error(`Error in ${operation}:`, error);
  
  // Determine error type
  const errorType = determineErrorType(error);
  
  // Get suggested fix based on error type and context
  const suggestedFix = getSuggestedFix(errorType, error, operation, context);
  
  // Get examples for the operation
  const examples = getExamplesForOperation(operation, context);
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: `Failed to perform operation: ${operation}`,
          errorType,
          message: (error as Error).message,
          details: error.response?.data || 'No additional details available',
          suggestedFix,
          examples,
          context: context || {},
        }, null, 2),
      },
    ],
    isError: true,
  };
}

// Determine the type of error
function determineErrorType(error: any): JiraInsightsErrorType {
  if (error.response?.status === 400) {
    return JiraInsightsErrorType.VALIDATION_ERROR;
  }
  if (error.response?.status === 404) {
    return JiraInsightsErrorType.NOT_FOUND;
  }
  if (error.response?.status === 403) {
    return JiraInsightsErrorType.PERMISSION_ERROR;
  }
  if (error.message?.includes('AQL')) {
    return JiraInsightsErrorType.QUERY_ERROR;
  }
  if (error.message?.includes('schema')) {
    return JiraInsightsErrorType.SCHEMA_ERROR;
  }
  return JiraInsightsErrorType.API_ERROR;
}

// Get suggested fix based on error type
function getSuggestedFix(
  errorType: JiraInsightsErrorType,
  error: any,
  operation: string,
  context?: Record<string, any>
): string {
  switch (errorType) {
    case JiraInsightsErrorType.VALIDATION_ERROR:
      return getValidationErrorFix(error, operation, context);
    case JiraInsightsErrorType.QUERY_ERROR:
      return getQueryErrorFix(error, context);
    case JiraInsightsErrorType.NOT_FOUND:
      return getNotFoundErrorFix(error, operation, context);
    case JiraInsightsErrorType.PERMISSION_ERROR:
      return 'Ensure you have the necessary permissions to perform this operation.';
    case JiraInsightsErrorType.SCHEMA_ERROR:
      return 'Check that the schema exists and is properly configured.';
    default:
      return 'Try again with modified parameters or contact support if the issue persists.';
  }
}

// Get fix for validation errors
function getValidationErrorFix(
  error: any,
  operation: string,
  context?: Record<string, any>
): string {
  const errorMessage = error.message || '';
  
  if (operation === 'query' && context?.aql) {
    return `Check your AQL syntax. Ensure object types and attributes exist. Try a simpler query first like: objectType = "Application"`;
  }
  
  if (errorMessage.includes('required')) {
    return 'Ensure all required parameters are provided.';
  }
  
  if (errorMessage.includes('format')) {
    return 'Check the format of your parameters.';
  }
  
  return 'Validate your input parameters against the API documentation.';
}

// Get fix for query errors
function getQueryErrorFix(
  error: any,
  context?: Record<string, any>
): string {
  const aql = context?.aql || '';
  
  if (aql.includes('==')) {
    return 'Note: == is case-sensitive equality, = is case-insensitive. Try using = instead.';
  }
  
  if (!aql.includes('=') && !aql.includes('>') && !aql.includes('<') && 
      !aql.includes('like') && !aql.includes('in')) {
    return 'Your query is missing a comparison operator (=, >, <, like, in, etc.). Try a basic query like: objectType = "Application"';
  }
  
  if (aql.includes('"') && aql.includes("'")) {
    return 'Mixing quote types can cause issues. Stick to one quote type (preferably double quotes).';
  }
  
  return 'Check your AQL syntax. Ensure object types and attributes exist. Try a simpler query first.';
}

// Get fix for not found errors
function getNotFoundErrorFix(
  error: any,
  operation: string,
  context?: Record<string, any>
): string {
  if (operation === 'get' && context?.objectTypeId) {
    return `Object type with ID ${context.objectTypeId} not found. Verify the ID is correct.`;
  }
  
  if (operation === 'get' && context?.objectId) {
    return `Object with ID ${context.objectId} not found. Verify the ID is correct.`;
  }
  
  if (operation === 'get' && context?.schemaId) {
    return `Schema with ID ${context.schemaId} not found. Verify the ID is correct.`;
  }
  
  return 'The requested resource was not found. Verify all IDs are correct.';
}

// Get examples for the operation
function getExamplesForOperation(
  operation: string,
  context?: Record<string, any>
): Record<string, any>[] {
  switch (operation) {
    case 'query':
      return [
        { aql: 'objectType = "Application"', description: 'Find all Applications' },
        { aql: 'objectType = "Server" AND "Operating System" like "Linux"', description: 'Find Linux servers' },
        { aql: 'objectType = "Database" AND Status = "Production"', description: 'Find production databases' },
      ];
    case 'get':
      return [
        { description: 'Get object by ID', parameters: { objectId: '123' } },
        { description: 'Get object type by ID', parameters: { objectTypeId: '456' } },
        { description: 'Get schema by ID', parameters: { schemaId: '789' } },
      ];
    case 'list':
      return [
        { description: 'List objects of type', parameters: { objectTypeId: '123', maxResults: 10 } },
        { description: 'List object types in schema', parameters: { schemaId: '456', maxResults: 20 } },
        { description: 'List all schemas', parameters: { maxResults: 50 } },
      ];
    case 'create':
      return [
        { 
          description: 'Create a new object', 
          parameters: { 
            objectTypeId: '123', 
            name: 'New Object', 
            attributes: { 'attr1': 'value1' } 
          } 
        },
      ];
    case 'update':
      return [
        { 
          description: 'Update an object', 
          parameters: { 
            objectId: '123', 
            name: 'Updated Object', 
            attributes: { 'attr1': 'new value' } 
          } 
        },
      ];
    default:
      return [{ description: 'No examples available for this operation' }];
  }
}
```

### Update Handler Files to Use the Error Handler

Update all handler files (`schema-handlers.ts`, `object-type-handlers.ts`, `object-handlers.ts`) to use the new error handling utility.

## 2. Fix AQL Query Format Issues

### Create AQL Utility (`src/utils/aql-utils.ts`)

```typescript
// AQL query utilities
export function validateAqlQuery(aql: string): { 
  isValid: boolean; 
  errors: string[]; 
  suggestions: string[] 
} {
  const errors = [];
  const suggestions = [];
  
  // Basic syntax validation
  if (!aql.includes('=') && !aql.includes('>') && !aql.includes('<') && 
      !aql.includes('like') && !aql.includes('in')) {
    errors.push('Query missing comparison operator (=, >, <, like, in, etc.)');
    suggestions.push('Try a basic query like: objectType = "Application"');
  }
  
  // Check for common mistakes
  if (aql.includes('==')) {
    suggestions.push('Note: == is case-sensitive equality, = is case-insensitive');
  }
  
  // Check for missing quotes around values with spaces
  const valueWithSpaceRegex = /=\s*(\w+\s+\w+)(?!\s*")/g;
  if (valueWithSpaceRegex.test(aql)) {
    errors.push('Values with spaces must be enclosed in quotes');
    suggestions.push('Example: Name = "John Doe" (not Name = John Doe)');
  }
  
  // Check for proper quoting
  const quoteCount = (aql.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    errors.push('Unbalanced quotes in query');
    suggestions.push('Ensure all opening quotes have matching closing quotes');
  }
  
  // Check for AND/OR operators
  if (aql.includes(' and ') || aql.includes(' or ')) {
    errors.push('Logical operators should be uppercase');
    suggestions.push('Use AND instead of and, OR instead of or');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

// Format AQL query for API request
export function formatAqlForRequest(aql: string): string {
  // Trim whitespace
  let formattedAql = aql.trim();
  
  // Ensure AND/OR operators are uppercase
  formattedAql = formattedAql.replace(/\s+and\s+/gi, ' AND ');
  formattedAql = formattedAql.replace(/\s+or\s+/gi, ' OR ');
  
  // Ensure spaces around operators
  formattedAql = formattedAql.replace(/([=<>])/g, ' $1 ').replace(/\s+/g, ' ');
  
  // Ensure proper quoting for values with spaces
  // This is a simplified approach - a more robust solution would use a parser
  
  return formattedAql;
}

// Get example AQL queries for a schema
export function getExampleQueriesForSchema(schemaId: string): string[] {
  const schemaExamples: Record<string, string[]> = {
    // Application Portfolio schema examples
    '2': [
      'objectType = "Application"',
      'objectType = "Application" AND Status = "Active"',
      'objectType = "Application" AND "Business Criticality" = "High"'
    ],
    // Engineering Support schema examples
    '4': [
      'objectType = "Server"',
      'objectType = "Server" AND "Operating System" like "Linux"',
      'objectType = "Database" AND Status = "Production"'
    ],
    // Default examples for any schema
    'default': [
      'objectType = "[ObjectTypeName]"',
      'objectType = "[ObjectTypeName]" AND [AttributeName] = "[Value]"',
      'objectType = "[ObjectTypeName]" AND [AttributeName] like "[Value]"'
    ]
  };
  
  return schemaExamples[schemaId] || schemaExamples['default'];
}
```

### Update Object Handlers to Use AQL Utilities

Update `object-handlers.ts` to use the new AQL utilities for query validation and formatting.

## 3. Attribute Discovery Enhancement

### Create Attribute Discovery Utility (`src/utils/attribute-utils.ts`)

```typescript
import { JiraClient } from '../client/jira-client.js';

// Cache for attributes to improve performance
const attributeCache = new Map<string, { 
  attributes: any[]; 
  timestamp: number;
}>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Get attributes for an object type with caching
 * @param jiraClient The Jira client
 * @param objectTypeId The object type ID
 * @param forceRefresh Force a refresh of the cache
 * @returns The attributes for the object type
 */
export async function getObjectTypeAttributes(
  jiraClient: JiraClient,
  objectTypeId: string,
  forceRefresh = false
): Promise<{
  attributes: any[];
  count: number;
  _cached?: boolean;
  _cachedAt?: string;
}> {
  // Check cache first if not forcing refresh
  if (!forceRefresh && attributeCache.has(objectTypeId)) {
    const cached = attributeCache.get(objectTypeId)!;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_EXPIRATION) {
      return {
        attributes: cached.attributes,
        count: cached.attributes.length,
        _cached: true,
        _cachedAt: new Date(cached.timestamp).toISOString()
      };
    }
  }
  
  try {
    const assetsApi = await jiraClient.getAssetsApi();
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
    
    // Update cache
    attributeCache.set(objectTypeId, {
      attributes,
      timestamp: Date.now()
    });
    
    return {
      attributes,
      count: attributes.length,
      _cached: false
    };
  } catch (error) {
    console.error(`Error fetching attributes for object type ${objectTypeId}:`, error);
    throw error;
  }
}

/**
 * Clear the attribute cache
 * @param objectTypeId Optional object type ID to clear specific cache entry
 */
export function clearAttributeCache(objectTypeId?: string): void {
  if (objectTypeId) {
    attributeCache.delete(objectTypeId);
  } else {
    attributeCache.clear();
  }
}

/**
 * Format attributes for object creation/update
 * @param attributes The attributes as key-value pairs
 * @returns Formatted attributes for the API
 */
export function formatAttributes(attributes: Record<string, any>): any[] {
  return Object.entries(attributes).map(([key, value]) => ({
    objectTypeAttributeId: key,
    objectAttributeValues: Array.isArray(value) 
      ? value.map(v => ({ value: v }))
      : [{ value }],
  }));
}
```

### Update Object Type Handlers to Use Attribute Utilities

Update `object-type-handlers.ts` to use the new attribute utilities for attribute discovery.

## 4. Integration and Testing

### Create Test Script (`scripts/test-api.js`)

```javascript
// Test script for API operations
const { execSync } = require('child_process');

// Configuration
const HOST = process.env.JIRA_HOST || 'https://your-domain.atlassian.net';
const EMAIL = process.env.JIRA_EMAIL || 'your-email@example.com';
const API_TOKEN = process.env.JIRA_API_TOKEN || 'your-api-token';

// Test schema operations
console.log('Testing schema operations...');
execSync(`JIRA_HOST=${HOST} JIRA_EMAIL=${EMAIL} JIRA_API_TOKEN=${API_TOKEN} node -e "
  const { initAssetsApiClient } = require('jira-insights-api');
  
  async function testSchemaOperations() {
    try {
      const instance = '${HOST}'.match(/https?:\\/\\/([^/]+)/)[1].split('.')[0];
      const client = await initAssetsApiClient({
        email: '${EMAIL}',
        apiToken: '${API_TOKEN}',
        instance
      });
      
      console.log('Listing schemas...');
      const schemas = await client.DefaultService.schemaList({ maxResults: 10 });
      console.log(\`Found \${schemas.values.length} schemas\`);
      
      if (schemas.values.length > 0) {
        const schemaId = schemas.values[0].id;
        console.log(\`Getting schema \${schemaId}...\`);
        const schema = await client.DefaultService.schemaFind({ id: schemaId });
        console.log(\`Schema name: \${schema.name}\`);
        
        console.log(\`Listing object types for schema \${schemaId}...\`);
        const objectTypes = await client.DefaultService.schemaFindAllObjectTypes({ 
          id: schemaId,
          excludeAbstract: false
        });
        console.log(\`Found \${objectTypes.values.length} object types\`);
        
        if (objectTypes.values.length > 0) {
          const objectTypeId = objectTypes.values[0].id;
          console.log(\`Getting object type \${objectTypeId}...\`);
          const objectType = await client.DefaultService.objectTypeFind({ id: objectTypeId });
          console.log(\`Object type name: \${objectType.name}\`);
          
          console.log(\`Listing attributes for object type \${objectTypeId}...\`);
          const attributes = await client.DefaultService.objectTypeFindAllAttributes({ 
            id: objectTypeId,
            onlyValueEditable: false,
            orderByName: false,
            query: '\"\"',
            includeValuesExist: false,
            excludeParentAttributes: false,
            includeChildren: false,
            orderByRequired: false
          });
          console.log(\`Found \${attributes.values.length} attributes\`);
          
          console.log('Testing AQL query...');
          try {
            const aql = \`objectType = \${objectTypeId}\`;
            console.log(\`Query: \${aql}\`);
            const objects = await client.DefaultService.objectsByAql({
              requestBody: {
                aql
              },
              startAt: 0,
              maxResults: 10,
              includeAttributes: true
            });
            console.log(\`Found \${objects.values.length} objects\`);
          } catch (error) {
            console.error('AQL query error:', error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  testSchemaOperations();
"`, { stdio: 'inherit' });
```

### Update API Migration TODO List

Update `docs/API_MIGRATION_TODO.md` with the progress made on the improvements.
