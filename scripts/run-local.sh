#!/bin/bash
set -e

# Check if environment variables are provided
if [ -z "$JIRA_API_TOKEN" ]; then
    echo "Error: JIRA_API_TOKEN environment variable is required"
    echo "Usage: JIRA_API_TOKEN=your_token JIRA_EMAIL=your_email JIRA_HOST=your_host ./scripts/run-local.sh"
    exit 1
fi

if [ -z "$JIRA_EMAIL" ]; then
    echo "Error: JIRA_EMAIL environment variable is required"
    echo "Usage: JIRA_API_TOKEN=your_token JIRA_EMAIL=your_email JIRA_HOST=your_host ./scripts/run-local.sh"
    exit 1
fi

if [ -z "$JIRA_HOST" ]; then
    echo "Error: JIRA_HOST environment variable is required"
    echo "Usage: JIRA_API_TOKEN=your_token JIRA_EMAIL=your_email JIRA_HOST=your_host ./scripts/run-local.sh"
    exit 1
fi

# Run local development image with provided credentials
echo "Starting jira-insights-mcp MCP server..."
echo "Configuration:"
echo "  Host: $JIRA_HOST"
echo "  Email: $JIRA_EMAIL"
echo "  API Token: [REDACTED]"

# Check if the Docker image exists
if ! docker image inspect jira-insights-mcp:local >/dev/null 2>&1; then
  echo "Error: Docker image 'jira-insights-mcp:local' not found."
  echo "Please build the image first using: ./scripts/build-local.sh"
  exit 1
fi

# Run the Docker container
docker run --rm -i \
  -e JIRA_API_TOKEN=$JIRA_API_TOKEN \
  -e JIRA_EMAIL=$JIRA_EMAIL \
  -e JIRA_HOST=$JIRA_HOST \
  jira-insights-mcp:local

echo "MCP server stopped."
