// Enhanced AQL query utilities
// Import types but don't use them directly to avoid linting warnings
// import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Enhanced AQL query utilities
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Interface for schema context used in validation
 */
export interface SchemaContext {
  objectTypes: string[];
  attributes: Record<string, string[]>;
  referenceTypes: string[];
}

/**
 * Enhanced validation for AQL queries with better error messages and suggestions
 * @param aql The AQL query to validate
 * @param schemaContext Optional schema context for attribute validation
 * @returns Validation result with errors, suggestions, and optional fixed query
 */
export function validateAqlQuery(aql: string, schemaContext?: SchemaContext): { 
  isValid: boolean; 
  errors: string[]; 
  suggestions: string[];
  fixedQuery?: string;
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Check for empty query
  if (!aql || aql.trim() === '') {
    errors.push('Query cannot be empty');
    return { isValid: false, errors, suggestions };
  }
  
  // Basic syntax validation
  if (!hasValidSyntaxStructure(aql)) {
    errors.push('Query missing valid comparison structure');
    suggestions.push('Basic query format: [attribute/keyword] [operator] [value]');
    suggestions.push('Example: ObjectType = "Application"');
  }
  
  // Validate operators
  const operatorErrors = validateOperators(aql);
  errors.push(...operatorErrors.errors);
  suggestions.push(...operatorErrors.suggestions);
  
  // Validate quotes
  const quoteErrors = validateQuotes(aql);
  errors.push(...quoteErrors.errors);
  suggestions.push(...quoteErrors.suggestions);
  
  // Validate logical operators (AND, OR, NOT)
  const logicalErrors = validateLogicalOperators(aql);
  errors.push(...logicalErrors.errors);
  suggestions.push(...logicalErrors.suggestions);
  
  // Validate parentheses
  const parenthesesErrors = validateParentheses(aql);
  errors.push(...parenthesesErrors.errors);
  suggestions.push(...parenthesesErrors.suggestions);
  
  // Schema-aware validation if schema context is provided
  if (schemaContext) {
    const schemaErrors = validateAgainstSchema(aql, schemaContext);
    errors.push(...schemaErrors.errors);
    suggestions.push(...schemaErrors.suggestions);
  }
  
  // Attempt to fix the query if there are errors
  let fixedQuery = undefined;
  if (errors.length > 0) {
    fixedQuery = attemptQueryFix(aql);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions,
    fixedQuery
  };
}

/**
 * Check if the query has a valid basic syntax structure
 * @param aql The AQL query to check
 * @returns Whether the query has a valid basic structure
 */
function hasValidSyntaxStructure(aql: string): boolean {
  // Check for basic comparison operators
  const hasComparisonOperator = /[=<>]|(\s+like\s+)|(\s+in\s+)|(\s+is\s+)/i.test(aql);
  
  // Check for functions
  const hasFunction = /\w+\s*\(/i.test(aql);
  
  // Check for having clause
  const hasHaving = /\s+having\s+/i.test(aql);
  
  return hasComparisonOperator || hasFunction || hasHaving;
}

/**
 * Validate operators in the query
 * @param aql The AQL query to validate
 * @returns Validation errors and suggestions
 */
function validateOperators(aql: string): { errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Check for invalid operators
  const invalidOperatorRegex = /[^=<>!]\s*(===|!==|<>)\s*[^=<>!]/g;
  if (invalidOperatorRegex.test(aql)) {
    errors.push('Invalid comparison operator detected');
    suggestions.push('Use = for equality, != for inequality, < for less than, > for greater than');
  }
  
  // Check for case-sensitive equality
  if (aql.includes('==')) {
    suggestions.push('Note: == is case-sensitive equality, = is case-insensitive');
  }
  
  // Check for like operator casing
  if (/\s+like\s+/i.test(aql) && !/\s+LIKE\s+/.test(aql)) {
    suggestions.push('LIKE operator should be uppercase: LIKE instead of like');
  }
  
  // Check for in operator casing
  if (/\s+in\s*\(/i.test(aql) && !/\s+IN\s*\(/.test(aql)) {
    suggestions.push('IN operator should be uppercase: IN instead of in');
  }
  
  return { errors, suggestions };
}

/**
 * Validate quotes in the query
 * @param aql The AQL query to validate
 * @returns Validation errors and suggestions
 */
function validateQuotes(aql: string): { errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Check for unbalanced quotes
  const doubleQuotes = (aql.match(/"/g) || []).length;
  const singleQuotes = (aql.match(/'/g) || []).length;
  
  if (doubleQuotes % 2 !== 0) {
    errors.push('Unbalanced double quotes in query');
    suggestions.push('Ensure all opening double quotes have matching closing quotes');
  }
  
  if (singleQuotes % 2 !== 0) {
    errors.push('Unbalanced single quotes in query');
    suggestions.push('Ensure all opening single quotes have matching closing quotes');
  }
  
  // Check for missing quotes around values with spaces
  const valueWithSpaceRegex = /=\s*(\w+\s+\w+)(?!\s*["'])/g;
  if (valueWithSpaceRegex.test(aql)) {
    errors.push('Values with spaces must be enclosed in quotes');
    suggestions.push('Example: Name = "John Doe" (not Name = John Doe)');
  }
  
  // Check for mixed quote types
  if (doubleQuotes > 0 && singleQuotes > 0) {
    suggestions.push('Consider using only one type of quotes (preferably double quotes) for consistency');
  }
  
  return { errors, suggestions };
}

/**
 * Validate logical operators in the query
 * @param aql The AQL query to validate
 * @returns Validation errors and suggestions
 */
function validateLogicalOperators(aql: string): { errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Check for lowercase logical operators
  if (/\s+and\s+/i.test(aql) && !/\s+AND\s+/.test(aql)) {
    errors.push('Logical operators should be uppercase');
    suggestions.push('Use AND instead of and');
  }
  
  if (/\s+or\s+/i.test(aql) && !/\s+OR\s+/.test(aql)) {
    errors.push('Logical operators should be uppercase');
    suggestions.push('Use OR instead of or');
  }
  
  if (/\s+not\s+/i.test(aql) && !/\s+NOT\s+/.test(aql)) {
    errors.push('Logical operators should be uppercase');
    suggestions.push('Use NOT instead of not');
  }
  
  // Check for missing parentheses in complex queries
  if ((aql.includes(' AND ') || aql.includes(' OR ')) && 
      aql.includes(' OR ') && !aql.includes('(')) {
    suggestions.push('Consider using parentheses for complex conditions: ObjectType = "Laptop" AND (Name LIKE "ThinkPad" OR Name LIKE "Lenovo")');
  }
  
  return { errors, suggestions };
}

/**
 * Validate parentheses in the query
 * @param aql The AQL query to validate
 * @returns Validation errors and suggestions
 */
function validateParentheses(aql: string): { errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Check for balanced parentheses
  const openParenCount = (aql.match(/\(/g) || []).length;
  const closeParenCount = (aql.match(/\)/g) || []).length;
  
  if (openParenCount !== closeParenCount) {
    errors.push('Unbalanced parentheses in query');
    suggestions.push('Ensure all opening parentheses have matching closing parentheses');
  }
  
  // Check for empty parentheses
  if (aql.includes('()')) {
    errors.push('Empty parentheses detected');
    suggestions.push('Remove empty parentheses or add content between them');
  }
  
  return { errors, suggestions };
}

/**
 * Validate the query against a schema context
 * @param aql The AQL query to validate
 * @param schema The schema context to validate against
 * @returns Validation errors and suggestions
 */
function validateAgainstSchema(aql: string, schema: SchemaContext): { errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Extract object types from query (simplified - would need more robust parsing)
  const objectTypeMatches = aql.match(/objectType\s*=\s*["']([^"']+)["']/gi);
  if (objectTypeMatches) {
    for (const match of objectTypeMatches) {
      const objectType = match.replace(/objectType\s*=\s*["']([^"']+)["']/i, '$1');
      if (!schema.objectTypes.includes(objectType)) {
        errors.push(`Object type "${objectType}" does not exist in the schema`);
        
        // Suggest similar object types
        const similarTypes = findSimilarStrings(objectType, schema.objectTypes);
        if (similarTypes.length > 0) {
          suggestions.push(`Did you mean one of these: ${similarTypes.join(', ')}?`);
        }
      }
    }
  }
  
  // More schema validation could be added here
  
  return { errors, suggestions };
}

/**
 * Find similar strings based on Levenshtein distance
 * @param target The target string to find similar strings for
 * @param candidates The candidate strings to compare against
 * @param maxDistance The maximum Levenshtein distance to consider (default: 3)
 * @returns Array of similar strings
 */
function findSimilarStrings(target: string, candidates: string[], maxDistance = 3): string[] {
  const similar: string[] = [];
  
  for (const candidate of candidates) {
    const distance = levenshteinDistance(target.toLowerCase(), candidate.toLowerCase());
    if (distance <= maxDistance) {
      similar.push(candidate);
    }
  }
  
  return similar;
}

/**
 * Calculate the Levenshtein distance between two strings
 * @param a First string
 * @param b Second string
 * @returns The Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize the matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Attempt to fix common issues in the query
 * @param aql The AQL query to fix
 * @param errors The validation errors
 * @returns The fixed query if possible, undefined otherwise
 */
function attemptQueryFix(aql: string): string | undefined {
  let fixedQuery = aql;
  
  // Fix logical operator casing
  fixedQuery = fixedQuery.replace(/\s+and\s+/gi, ' AND ');
  fixedQuery = fixedQuery.replace(/\s+or\s+/gi, ' OR ');
  fixedQuery = fixedQuery.replace(/\s+not\s+/gi, ' NOT ');
  
  // Fix operator casing
  fixedQuery = fixedQuery.replace(/\s+like\s+/gi, ' LIKE ');
  fixedQuery = fixedQuery.replace(/\s+in\s+/gi, ' IN ');
  
  // Fix ObjectType casing
  fixedQuery = fixedQuery.replace(/\bobjecttype\b/gi, 'ObjectType');
  
  // Fix spacing around operators
  fixedQuery = fixedQuery.replace(/([=<>])/g, ' $1 ').replace(/\s+/g, ' ');
  
  // Add quotes around values with spaces
  const valueWithSpaceRegex = /=\s*(\w+(?:\s+\w+)+)(?!\s*["'])/g;
  fixedQuery = fixedQuery.replace(valueWithSpaceRegex, '= "$1"');
  
  // If the fixed query is the same as the original, return undefined
  return fixedQuery !== aql ? fixedQuery : undefined;
}

/**
 * Enhanced formatting for AQL queries
 * @param aql The AQL query to format
 * @param autoFix Whether to automatically fix common issues (default: true)
 * @returns The formatted query
 */
export function formatAqlForRequest(aql: string, autoFix = true): string {
  // Start with basic formatting
  let formattedAql = aql.trim();
  
  if (!autoFix) {
    // Just do minimal formatting if auto-fix is disabled
    return formattedAql;
  }
  
  // Fix logical operator casing
  formattedAql = formattedAql.replace(/\s+and\s+/gi, ' AND ');
  formattedAql = formattedAql.replace(/\s+or\s+/gi, ' OR ');
  formattedAql = formattedAql.replace(/\s+not\s+/gi, ' NOT ');
  
  // Fix operator casing
  formattedAql = formattedAql.replace(/\s+like\s+/gi, ' LIKE ');
  formattedAql = formattedAql.replace(/\s+in\s+/gi, ' IN ');
  
  // Fix ObjectType casing
  formattedAql = formattedAql.replace(/\bobjecttype\b/gi, 'ObjectType');
  
  // Fix spacing around operators
  formattedAql = formattedAql.replace(/([=<>])/g, ' $1 ').replace(/\s+/g, ' ');
  
  // Add quotes around values with spaces
  const valueWithSpaceRegex = /=\s*(\w+(?:\s+\w+)+)(?!\s*["'])/g;
  formattedAql = formattedAql.replace(valueWithSpaceRegex, '= "$1"');
  
  return formattedAql;
}

/**
 * Get example AQL queries for a schema with better context
 * @param schemaId The schema ID to get examples for
 * @param objectTypeId Optional object type ID to get specific examples for
 * @returns Array of example queries with descriptions
 */
export function getExampleQueriesWithContext(
  schemaId: string,
  objectTypeId?: string
): Array<{ query: string; description: string }> {
  // Schema-specific examples
  const schemaExamples: Record<string, Array<{ query: string; description: string }>> = {
    // IT Employee Assets schema examples
    '6': [
      { 
        query: 'ObjectType = "Supported laptops"', 
        description: 'Find all supported laptop models' 
      },
      { 
        query: 'ObjectType = "Laptops" AND Status = "Active"', 
        description: 'Find all active laptops' 
      },
      { 
        query: 'ObjectType = "Supported laptops" AND "Screen size" = "13-inch"', 
        description: 'Find all 13-inch supported laptops' 
      },
      { 
        query: 'ObjectType = "Supported laptops" AND Manufacturer.Name = "Apple"', 
        description: 'Find all Apple laptops' 
      }
    ],
    // Application Portfolio schema examples
    '2': [
      { 
        query: 'ObjectType = "Application"', 
        description: 'Find all applications' 
      },
      { 
        query: 'ObjectType = "Application" AND Status = "Active"', 
        description: 'Find all active applications' 
      },
      { 
        query: 'ObjectType = "Application" AND "Business Criticality" = "High"', 
        description: 'Find all business-critical applications' 
      }
    ],
    // Engineering Support schema examples
    '4': [
      { 
        query: 'ObjectType = "Server"', 
        description: 'Find all servers' 
      },
      { 
        query: 'ObjectType = "Server" AND "Operating System" LIKE "Linux"', 
        description: 'Find all Linux servers' 
      },
      { 
        query: 'ObjectType = "Database" AND Status = "Production"', 
        description: 'Find all production databases' 
      }
    ],
    // Default examples for any schema
    'default': [
      { 
        query: 'ObjectType = "[ObjectTypeName]"', 
        description: 'Find all objects of a specific type' 
      },
      { 
        query: 'ObjectType = "[ObjectTypeName]" AND [AttributeName] = "[Value]"', 
        description: 'Find objects with a specific attribute value' 
      },
      { 
        query: 'ObjectType = "[ObjectTypeName]" AND [AttributeName] LIKE "[Value]"', 
        description: 'Find objects with an attribute containing a value' 
      },
      { 
        query: 'ObjectType = "[ObjectTypeName]" AND ([AttributeName] = "[Value1]" OR [AttributeName] = "[Value2]")', 
        description: 'Find objects matching multiple possible values' 
      }
    ]
  };
  
  // Object type specific examples
  const objectTypeExamples: Record<string, Array<{ query: string; description: string }>> = {
    // Supported laptops examples
    '30': [
      { 
        query: 'ObjectType = "Supported laptops" AND "Screen size" = "13-inch"', 
        description: 'Find all 13-inch supported laptops' 
      },
      { 
        query: 'ObjectType = "Supported laptops" AND RAM LIKE "16GB"', 
        description: 'Find all supported laptops with 16GB RAM' 
      },
      { 
        query: 'ObjectType = "Supported laptops" AND Manufacturer.Name = "Apple"', 
        description: 'Find all Apple laptops' 
      }
    ],
    // Laptops examples
    '70': [
      { 
        query: 'ObjectType = "Laptops" AND Status = "Active"', 
        description: 'Find all active laptops' 
      },
      { 
        query: 'ObjectType = "Laptops" AND "Serial Number" = "[SerialNumber]"', 
        description: 'Find a laptop by serial number' 
      }
    ]
  };
  
  // Return object type examples if specified
  if (objectTypeId && objectTypeExamples[objectTypeId]) {
    return objectTypeExamples[objectTypeId];
  }
  
  // Return schema examples or default examples
  return schemaExamples[schemaId] || schemaExamples['default'];
}

/**
 * Generate a contextual error message for AQL errors
 * @param error The error object
 * @param aql The original AQL query (not used, kept for backward compatibility)
 * @returns A contextual error message with suggestions
 */
export function getContextualErrorMessage(error: Record<string, unknown>, aql?: string): { 
  message: string; 
  suggestions: string[];
} {
  const suggestions: string[] = [];
  const errorMessage = typeof error.message === 'string' ? error.message : 'Unknown error occurred while processing AQL query';
  let message = errorMessage;
  
  // Check for syntax errors
  if (errorMessage.includes('syntax') || errorMessage.includes('parse')) {
    message = 'AQL syntax error: The query could not be parsed correctly';
    suggestions.push('Check for missing or unbalanced quotes, parentheses, or operators');
    suggestions.push('Ensure all values with spaces are enclosed in quotes');
  }
  
  // Check for attribute errors
  else if (message.includes('attribute') || message.includes('property')) {
    message = 'Attribute error: The specified attribute may not exist or is invalid';
    suggestions.push('Verify that the attribute name is spelled correctly');
    suggestions.push('Check that the attribute exists for the specified object type');
  }
  
  // Check for object type errors
  else if (message.includes('objectType') || message.includes('object type')) {
    message = 'Object type error: The specified object type may not exist or is invalid';
    suggestions.push('Verify that the object type name is spelled correctly');
    suggestions.push('Check that the object type exists in the schema');
  }
  
  // Check for value errors
  else if (message.includes('value')) {
    message = 'Value error: The specified value is invalid or in the wrong format';
    suggestions.push('Ensure values with spaces are enclosed in quotes');
    suggestions.push('Check that date values are in the correct format');
  }
  
  // Add example queries as suggestions
  suggestions.push('Try a simple query first, like: ObjectType = "Application"');
  
  return { message, suggestions };
}
