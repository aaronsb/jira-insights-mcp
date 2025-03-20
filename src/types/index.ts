// Operation types
export type SchemaOperation = 'get' | 'list' | 'create' | 'update' | 'delete';
export type ObjectTypeOperation = 'get' | 'list' | 'create' | 'update' | 'delete';
export type ObjectOperation = 'get' | 'list' | 'create' | 'update' | 'delete' | 'query';

// Jira client configuration
export interface JiraClientConfig {
  host: string;
  email: string;
  apiToken: string;
}

// Tool response type
export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

// Schema context for AQL validation
export interface SchemaContext {
  objectTypes: string[];
  attributes: Record<string, string[]>;
  referenceTypes: string[];
}

// Tool schema type
export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}
