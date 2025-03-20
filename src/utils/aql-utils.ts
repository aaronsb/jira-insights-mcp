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
      !aql.includes('like') && !aql.includes('LIKE') && !aql.includes('in') && !aql.includes('IN')) {
    errors.push('Query missing comparison operator (=, >, <, LIKE, IN, etc.)');
    suggestions.push('Try a basic query like: ObjectType = "Application"');
  }
  
  // Check for common mistakes
  if (aql.includes('==')) {
    suggestions.push('Note: == is case-sensitive equality, = is case-insensitive');
  }
  
  // Check for object type case sensitivity
  if (aql.toLowerCase().includes('objecttype') && !aql.includes('ObjectType')) {
    errors.push('ObjectType should use proper case sensitivity');
    suggestions.push('Use ObjectType = "..." instead of objectType = "..."');
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
  
  // Check for parentheses in complex queries
  if ((aql.includes(' AND ') || aql.includes(' OR ')) && 
      aql.includes(' OR ') && !aql.includes('(')) {
    suggestions.push('Consider using parentheses for complex conditions: ObjectType = "Laptop" AND (Name LIKE "ThinkPad" OR Name LIKE "Lenovo")');
  }
  
  // Check for NOT operator usage
  if (aql.includes(' NOT ') && !aql.includes(' AND NOT ')) {
    suggestions.push('NOT operator is typically used with AND: ObjectType = "Laptop" AND NOT Name LIKE "MacBook"');
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
  
  // Ensure AND/OR/NOT operators are uppercase
  formattedAql = formattedAql.replace(/\s+and\s+/gi, ' AND ');
  formattedAql = formattedAql.replace(/\s+or\s+/gi, ' OR ');
  formattedAql = formattedAql.replace(/\s+not\s+/gi, ' NOT ');
  
  // Ensure LIKE operator is uppercase
  formattedAql = formattedAql.replace(/\s+like\s+/gi, ' LIKE ');
  
  // Ensure IN operator is uppercase
  formattedAql = formattedAql.replace(/\s+in\s+/gi, ' IN ');
  
  // Ensure proper case for ObjectType
  formattedAql = formattedAql.replace(/\bobjecttype\b/gi, 'ObjectType');
  
  // Ensure spaces around operators
  formattedAql = formattedAql.replace(/([=<>])/g, ' $1 ').replace(/\s+/g, ' ');
  
  // Ensure proper quoting for values with spaces
  // This is a simplified approach - a more robust solution would use a parser
  const valueWithSpaceRegex = /=\s*(\w+\s+\w+)(?!\s*")/g;
  if (valueWithSpaceRegex.test(formattedAql)) {
    // Try to add quotes around values with spaces
    formattedAql = formattedAql.replace(/=\s*(\w+(?:\s+\w+)+)(?!\s*")/g, '= "$1"');
  }
  
  return formattedAql;
}

// Get example AQL queries for a schema
export function getExampleQueriesForSchema(schemaId: string): string[] {
  const schemaExamples: Record<string, string[]> = {
    // Application Portfolio schema examples
    '2': [
      'ObjectType = "Application"',
      'ObjectType = "Application" AND Status = "Active"',
      'ObjectType = "Application" AND "Business Criticality" = "High"'
    ],
    // Engineering Support schema examples
    '4': [
      'ObjectType = "Server"',
      'ObjectType = "Server" AND "Operating System" LIKE "Linux"',
      'ObjectType = "Database" AND Status = "Production"'
    ],
    // Default examples for any schema
    'default': [
      'ObjectType = "[ObjectTypeName]"',
      'ObjectType = "[ObjectTypeName]" AND [AttributeName] = "[Value]"',
      'ObjectType = "[ObjectTypeName]" AND [AttributeName] LIKE "[Value]"',
      'ObjectType = "[ObjectTypeName]" AND (Name LIKE "[Value1]" OR Name LIKE "[Value2]")',
      'ObjectType = "[ObjectTypeName]" AND NOT Name LIKE "[Value]"'
    ]
  };
  
  return schemaExamples[schemaId] || schemaExamples['default'];
}
