# Jira Insights MCP

A Model Context Protocol (MCP) server for managing Jira Insights (JSM) asset schemas.

Last updated: 2025-04-09

## Overview

This MCP server provides tools for interacting with Jira Insights (JSM) asset schemas through the Model Context Protocol. It allows you to manage object schemas, object types, and objects in Jira Insights.

## Features

- Manage object schemas (create, read, update, delete)
- Manage object types (create, read, update, delete)
- Manage objects (create, read, update, delete)
- Query objects using AQL (Atlassian Query Language)

## Prerequisites

- Node.js 20 or later
- Docker (for containerized deployment)
- Jira Insights instance with API access
- Jira API token with appropriate permissions

## Installation

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/aaronsb/jira-insights-mcp.git
   cd jira-insights-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Docker

Build the Docker image:

```bash
./scripts/build-local.sh
```

## Usage

### MCP Configuration

To use this MCP server with Claude or other AI assistants that support the Model Context Protocol, add it to your MCP configuration using one of the following methods:

#### Local Build Configuration

If you've built the project locally, use this configuration:

```json
{
  "mcpServers": {
    "jira-insights": {
      "command": "node",
      "args": ["/path/to/jira-insights-mcp/build/index.js"],
      "env": {
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_HOST": "https://your-domain.atlassian.net",
        "LOG_MODE": "strict"
      }
    }
  }
}
```

#### Docker-based Configuration

If you prefer to use the Docker image (recommended for most users), use this configuration:

```json
{
  "mcpServers": {
    "jira-insights": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e", "JIRA_API_TOKEN",
        "-e", "JIRA_EMAIL",
        "-e", "JIRA_HOST",
        "ghcr.io/aaronsb/jira-insights-mcp:latest"
      ],
      "env": {
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_HOST": "https://your-domain.atlassian.net"
      }
    }
  }
}
```

This Docker-based configuration pulls the latest image from GitHub Container Registry and runs it with the necessary environment variables.

### Running Locally for Development

For local development and testing:

```bash
# Build the Docker image
./scripts/build-local.sh

# Run the Docker container
JIRA_API_TOKEN=your_token JIRA_EMAIL=your_email JIRA_HOST=your_host ./scripts/run-local.sh
```

## Available Tools

### manage_jira_insight_schema

Manage Jira Insights object schemas with CRUD operations.

```json
{
  "operation": "list",
  "maxResults": 10
}
```

### manage_jira_insight_object_type

Manage Jira Insights object types with CRUD operations.

```json
{
  "operation": "list",
  "schemaId": "1",
  "maxResults": 20
}
```

### manage_jira_insight_object

Manage Jira Insights objects with CRUD operations and AQL queries.

```json
{
  "operation": "query",
  "aql": "objectType = \"Application\"",
  "maxResults": 10
}
```

## Available Resources

The MCP server provides several resources for accessing Jira Insights data:

- `jira-insights://instance/summary` - High-level statistics about the Jira Insights instance
- `jira-insights://aql-syntax` - Comprehensive guide to Assets Query Language (AQL) syntax with examples
- `jira-insights://schemas/all` - Complete list of all schemas with their object types
- `jira-insights://schemas/{schemaId}/full` - Complete definition of a specific schema including object types
- `jira-insights://schemas/{schemaId}/overview` - Overview of a specific schema including metadata and statistics
- `jira-insights://object-types/{objectTypeId}/overview` - Overview of a specific object type including attributes and statistics

## Planned Improvements

We are working on several improvements to enhance the functionality and usability of the Jira Insights MCP:

### High Priority Improvements

1. **Enhanced Error Handling**
   - More detailed error messages with specific validation issues
   - Suggested fixes for common errors
   - Operation-specific examples to help users correct issues

2. **AQL Query Improvements**
   - Validation and formatting utilities for AQL queries
   - Schema-specific example queries
   - Better error messages for query issues

3. **Attribute Discovery Enhancement**
   - Improved attribute retrieval for object types
   - Caching for better performance
   - Better handling of the "expand" parameter

### Medium Priority Improvements

1. **Object Template Generation**
   - Templates for creating objects based on object types
   - Type-specific placeholder generation
   - Validation rules in templates

2. **Example Query Library**
   - Schema-specific example queries
   - Context-aware query suggestions
   - Query templates for common operations

3. **Improved Documentation**
   - Enhanced AQL syntax documentation
   - Operation-specific documentation
   - Common error scenarios and solutions

For more details on the planned improvements, see:
- `TODO.md` - Comprehensive todo list with all tasks organized by priority
- `IMPLEMENTATION_PLAN.md` - Detailed implementation plans for the high-priority improvements
- `HANDLER_IMPROVEMENTS.md` - Specific changes needed for each handler file
- `IMPROVEMENT_SUMMARY.md` - Concise summary of the planned improvements
- `docs/API_MIGRATION_TODO.md` - Status of the API migration and planned improvements

## Development

### Scripts

- `npm run build`: Build the TypeScript code
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Run ESLint with auto-fix
- `npm run test`: Run tests
- `npm run watch`: Watch for changes and rebuild
- `npm run generate-diagrams`: Generate TypeScript dependency diagrams

### Docker Scripts

- `./scripts/build-local.sh`: Build the Docker image
- `./scripts/run-local.sh`: Run the Docker container

## Troubleshooting

### Common Issues

1. **AQL Query Validation Errors**
   - Ensure values with spaces are enclosed in quotes: `Name = "John Doe"`
   - Use uppercase for logical operators: `AND`, `OR` (not `and`, `or`)
   - Check that object types and attributes exist in your schema

2. **Object Type Attribute Issues**
   - When using the "expand" parameter with "attributes", ensure the object type exists
   - Check that you have permissions to view the attributes

3. **API Connection Issues**
   - Verify your Jira API token has the necessary permissions
   - Check that the Jira host URL is correct
   - Ensure your network allows connections to the Jira API

## License

MIT
