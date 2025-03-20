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
