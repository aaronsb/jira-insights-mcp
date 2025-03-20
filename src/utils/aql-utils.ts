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
