/**
 * Configuration for the Jira client
 */
export interface JiraClientConfig {
  /**
   * Jira host URL (e.g., https://your-domain.atlassian.net)
   */
  host: string;
  
  /**
   * Jira user email
   */
  email: string;
  
  /**
   * Jira API token
   */
  apiToken: string;
}

/**
 * Common response format for MCP tools
 */
export interface ToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
  tools?: Array<{
    name: string;
    inputSchema: {
      type: string;
      properties?: Record<string, any>;
    };
    description?: string;
  }>;
  _meta?: Record<string, any>;
  nextCursor?: string;
}

/**
 * Schema for tool schemas
 */
export interface ToolSchema {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Object schema operations
 */
export type SchemaOperation = 'get' | 'list' | 'create' | 'update' | 'delete';

/**
 * Object type operations
 */
export type ObjectTypeOperation = 'get' | 'list' | 'create' | 'update' | 'delete';

/**
 * Object operations
 */
export type ObjectOperation = 'get' | 'list' | 'create' | 'update' | 'delete' | 'query';
