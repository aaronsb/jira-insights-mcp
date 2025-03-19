#!/usr/bin/env node

import { generateDependencyGraph } from '@ysk8hori/typescript-graph';
import fs from 'fs';
import path from 'path';

// Configuration for the dependency graph generation
const config = {
  // Entry points for the dependency graph
  entryPoints: ['src/index.ts'],
  
  // Output directory for the generated diagrams
  outputDir: 'docs/diagrams',
  
  // Include only files from our src directory
  fileFilter: (filePath) => filePath.includes('/src/'),
  
  // Group files by directory for better organization
  groupByFolder: true,
  
  // Customize the appearance of the graph
  theme: {
    backgroundColor: '#ffffff',
    nodeColor: '#4b7bec',
    nodeHoverColor: '#3867d6',
    edgeColor: '#a5b1c2',
    edgeHoverColor: '#778ca3',
    textColor: '#2f3542',
    fontSize: 12,
  },
  
  // Generate both SVG and HTML outputs
  outputFormats: ['svg', 'html'],
};

// Ensure the output directory exists
if (!fs.existsSync(config.outputDir)) {
  fs.mkdirSync(config.outputDir, { recursive: true });
}

// Generate the dependency graph
console.log('Generating TypeScript dependency graph...');
console.log(`Entry points: ${config.entryPoints.join(', ')}`);
console.log(`Output directory: ${config.outputDir}`);

try {
  generateDependencyGraph(config);
  console.log('Dependency graph generated successfully!');
  
  // List the generated files
  const files = fs.readdirSync(config.outputDir);
  console.log('\nGenerated files:');
  files.forEach(file => {
    console.log(`- ${path.join(config.outputDir, file)}`);
  });
} catch (error) {
  console.error('Error generating dependency graph:', error);
  process.exit(1);
}
