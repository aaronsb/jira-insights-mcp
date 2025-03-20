#!/usr/bin/env node

/**
 * Test script for AQL query improvements
 * 
 * This script demonstrates the enhanced AQL query validation, formatting, and error handling.
 * 
 * Usage:
 *   node scripts/test-aql-improvements.js
 */

import { validateAqlQuery, formatAqlForRequest, getExampleQueriesWithContext, getContextualErrorMessage } from '../build/utils/enhanced-aql-utils.js';

// Sample schema context for testing
const sampleSchemaContext = {
  objectTypes: ['Supported laptops', 'Laptops', 'Servers', 'Applications'],
  attributes: {
    'Supported laptops': ['Name', 'Screen size', 'CPU', 'RAM', 'Storage', 'Status', 'Target Roles', 'Cost', 'Manufacturer'],
    'Laptops': ['Name', 'Serial Number', 'Model', 'Assigned To', 'Status'],
    'Servers': ['Name', 'IP Address', 'Operating System', 'Status', 'Location'],
    'Applications': ['Name', 'Version', 'Vendor', 'Status', 'Business Criticality']
  },
  referenceTypes: ['Provided by', 'Assigned to', 'Installed on', 'Depends on']
};

// Test queries
const testQueries = [
  // Valid queries
  { 
    query: 'ObjectType = "Supported laptops"',
    description: 'Basic valid query'
  },
  { 
    query: 'ObjectType = "Supported laptops" AND "Screen size" = "13-inch"',
    description: 'Valid query with attribute filter'
  },
  { 
    query: 'ObjectType = "Supported laptops" AND Manufacturer.Name = "Apple"',
    description: 'Valid query with reference attribute'
  },
  
  // Queries with common errors
  { 
    query: 'objecttype = "Supported laptops"',
    description: 'Incorrect case for ObjectType'
  },
  { 
    query: 'ObjectType = Supported laptops',
    description: 'Missing quotes around value with spaces'
  },
  { 
    query: 'ObjectType = "Supported laptops" and "Screen size" = "13-inch"',
    description: 'Lowercase logical operator'
  },
  { 
    query: 'ObjectType = "Unknown Type"',
    description: 'Non-existent object type'
  },
  { 
    query: 'ObjectType = "Supported laptops" AND "Unknown Attribute" = "Value"',
    description: 'Non-existent attribute'
  },
  { 
    query: 'ObjectType = "Supported laptops" AND (RAM = "16GB" OR RAM = "8GB"',
    description: 'Unbalanced parentheses'
  }
];

// Test validation and formatting
console.log('=== Testing AQL Query Validation and Formatting ===\n');

for (const test of testQueries) {
  console.log(`Testing query: ${test.query}`);
  console.log(`Description: ${test.description}`);
  
  // Validate the query
  const validation = validateAqlQuery(test.query, sampleSchemaContext);
  
  console.log(`Valid: ${validation.isValid}`);
  
  if (!validation.isValid) {
    console.log('Errors:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
    
    console.log('Suggestions:');
    validation.suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
    
    if (validation.fixedQuery) {
      console.log(`Suggested fix: ${validation.fixedQuery}`);
    }
  }
  
  // Format the query
  const formattedQuery = formatAqlForRequest(test.query);
  console.log(`Formatted query: ${formattedQuery}`);
  
  console.log('\n---\n');
}

// Test example queries
console.log('=== Testing Example Queries ===\n');

const schemaId = '6'; // IT Employee Assets schema
const examples = getExampleQueriesWithContext(schemaId);

console.log(`Example queries for schema ${schemaId}:`);
examples.forEach(example => {
  console.log(`- ${example.query}`);
  console.log(`  Description: ${example.description}`);
});

console.log('\n---\n');

// Test error handling
console.log('=== Testing Error Handling ===\n');

const sampleErrors = [
  { 
    message: 'Syntax error in AQL query',
    aql: 'ObjectType = "Supported laptops" AND'
  },
  { 
    message: 'Attribute "Unknown" not found',
    aql: 'ObjectType = "Supported laptops" AND "Unknown" = "Value"'
  },
  { 
    message: 'Object type "NonExistent" not found',
    aql: 'ObjectType = "NonExistent"'
  }
];

for (const error of sampleErrors) {
  console.log(`Error message: ${error.message}`);
  console.log(`Query: ${error.aql}`);
  
  const { message, suggestions } = getContextualErrorMessage(error, error.aql);
  
  console.log(`Contextual message: ${message}`);
  console.log('Suggestions:');
  suggestions.forEach(suggestion => console.log(`  - ${suggestion}`));
  
  console.log('\n---\n');
}

console.log('Test completed successfully!');
