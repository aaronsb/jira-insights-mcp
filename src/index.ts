#!/usr/bin/env node

// Configure logging based on LOG_MODE environment variable
// This MUST be at the very top, before any imports
// to ensure all logging is properly redirected
const LOG_MODE = process.env.LOG_MODE || 'normal';
if (LOG_MODE === 'strict') {
  // In strict mode, redirect all console.log to console.error
  // This ensures only JSON-RPC data goes to stdout
  const originalConsoleLog = console.log;
  console.log = function(...args) {
    console.error('[STDOUT→STDERR]', ...args);
  };
  console.error('LOG_MODE=strict: Redirecting all stdout logging to stderr');
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { JiraClient } from './client/jira-client.js';
import { setupObjectHandlers } from './handlers/object-handlers.js';
import { setupObjectTypeHandlers } from './handlers/object-type-handlers.js';
import { setupResourceHandlers } from './handlers/resource-handlers.js';
import { setupSchemaHandlers } from './handlers/schema-handlers.js';
import { toolSchemas } from './schemas/tool-schemas.js';
import { SchemaCacheManager } from './utils/schema-cache-manager.js';

// Jira credentials from environment variables
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_HOST = process.env.JIRA_HOST;

if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_HOST) {
  throw new Error('Missing required Jira credentials in environment variables');
}

class JiraInsightsServer {
  private server: Server;
  private jiraClient: JiraClient;
  private schemaCacheManager: SchemaCacheManager;

  constructor() {
    console.error('Loading tool schemas...');
    console.error('Available schemas:', Object.keys(toolSchemas));

    // Convert tool schemas to the format expected by the MCP SDK
    const tools = Object.entries(toolSchemas).map(([key, schema]) => {
      console.error(`Registering tool: ${key}`);
      const inputSchema = {
        type: 'object',
        properties: schema.inputSchema.properties,
      } as const;

      // Only add required field if it exists in the schema
      if ('required' in schema.inputSchema) {
        Object.assign(inputSchema, { required: schema.inputSchema.required });
      }

      return {
        name: key,
        description: schema.description,
        inputSchema,
      };
    });

    console.error('Initializing server with tools:', JSON.stringify(tools, null, 2));

    // Use environment-provided name or default to 'jira-insights-mcp'
    const serverName = process.env.MCP_SERVER_NAME || 'jira-insights-mcp';
    console.error(`Using server name: ${serverName}`);

    this.server = new Server(
      {
        name: serverName,
        version: '0.1.0',
        description: 'Jira Insights MCP Server - Provides tools for interacting with Jira Insights (JSM) asset schemas',
      },
      {
        capabilities: {
          tools: {
            schemas: tools,
          },
          resources: {
            schemas: [], // Resource schemas are handled by the resource handlers
          },
        },
      }
    );

    this.jiraClient = new JiraClient({
      host: JIRA_HOST!,
      email: JIRA_EMAIL!,
      apiToken: JIRA_API_TOKEN!,
    });

    // Initialize the schema cache manager
    this.schemaCacheManager = new SchemaCacheManager(this.jiraClient);
    console.error('Schema cache manager initialized');

    this.setupHandlers();

    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers() {
    // Set up required MCP protocol handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Object.entries(toolSchemas).map(([key, schema]) => ({
        name: key,
        description: schema.description,
        inputSchema: {
          type: 'object',
          properties: schema.inputSchema.properties,
          ...(('required' in schema.inputSchema) ? { required: schema.inputSchema.required } : {}),
        },
      })),
    }));

    // Set up resource handlers
    const resourceHandlers = setupResourceHandlers(this.jiraClient, this.schemaCacheManager);
    this.server.setRequestHandler(ListResourcesRequestSchema, resourceHandlers.listResources);
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, resourceHandlers.listResourceTemplates);
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return resourceHandlers.readResource(request.params.uri);
    });

    // Set up tool handlers
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      console.error('Received request:', JSON.stringify(request, null, 2));

      const { name } = request.params;
      console.error(`Handling tool request: ${name}`);

      try {
        let response;

        // Schema-related tools
        if (['manage_jira_insight_schema'].includes(name)) {
          response = await setupSchemaHandlers(this.server, this.jiraClient, this.schemaCacheManager, request);
        }

        // Object Type-related tools
        else if (['manage_jira_insight_object_type'].includes(name)) {
          response = await setupObjectTypeHandlers(this.server, this.jiraClient, this.schemaCacheManager, request);
        }

        // Object-related tools
        else if (['manage_jira_insight_object'].includes(name)) {
          response = await setupObjectHandlers(this.server, this.jiraClient, request);
        }

        else {
          console.error(`Unknown tool requested: ${name}`);
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }

        // Ensure we always return a valid response
        if (!response) {
          throw new McpError(ErrorCode.InternalError, `No response from handler for tool: ${name}`);
        }

        // Convert ToolResponse to the expected return type
        return {
          content: response.content,
          ...(response.isError ? { isError: response.isError } : {})
        };
      } catch (error) {
        console.error('Error handling request:', error);
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, 'Internal server error');
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Jira Insights MCP server running on stdio');
  }
}

const server = new JiraInsightsServer();
server.run().catch(console.error);
