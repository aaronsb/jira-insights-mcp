# Jira Insights MCP

A Model Context Protocol (MCP) server for managing Jira Insights (JSM) asset schemas.

Last updated: 2025-03-19

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

To use this MCP server with Claude or other AI assistants that support the Model Context Protocol, add it to your MCP configuration:

```json
{
  "mcpServers": {
    "jira-insights": {
      "command": "node",
      "args": ["/path/to/jira-insights-mcp/build/index.js"],
      "env": {
        "JIRA_API_TOKEN": "your-api-token",
        "JIRA_EMAIL": "your-email@example.com",
        "JIRA_HOST": "https://your-domain.atlassian.net"
      }
    }
  }
}
```

### Running Locally for Development

For local development and testing:

```bash
# Build the Docker image
./scripts/build-local.sh

# Run the Docker container
JIRA_API_TOKEN=your_token JIRA_EMAIL=your_email JIRA_HOST=your_host ./scripts/run-local.sh
```

## Available Tools

### manage_jira_schema

Manage Jira Insights object schemas with CRUD operations.

### manage_jira_object_type

Manage Jira Insights object types with CRUD operations.

### manage_jira_object

Manage Jira Insights objects with CRUD operations and AQL queries.

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

## License

MIT
