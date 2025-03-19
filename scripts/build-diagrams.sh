#!/bin/bash
set -e

# This script generates TypeScript dependency diagrams for the project
# It uses @ysk8hori/typescript-graph to create visual representations
# of the codebase structure

# Create output directory if it doesn't exist
DIAGRAMS_DIR="./docs/diagrams"
mkdir -p "$DIAGRAMS_DIR"

echo "Generating TypeScript dependency diagrams..."

# Run the TypeScript graph generator
node scripts/generate-typescript-graph.js

echo "Diagrams generated successfully in $DIAGRAMS_DIR"
echo "You can open the HTML files in your browser to view the interactive diagrams"
