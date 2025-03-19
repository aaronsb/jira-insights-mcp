#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Function to update timestamps in markdown files
function updateTimestamps(directory) {
  // Get all markdown files in the directory
  const files = fs.readdirSync(directory, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(directory, file.name);
    
    if (file.isDirectory()) {
      // Recursively process subdirectories
      updateTimestamps(filePath);
    } else if (file.name.endsWith('.md')) {
      // Process markdown files
      console.log(`Updating timestamps in ${filePath}`);
      
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace the timestamp placeholder with the current date
        const now = new Date();
        const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        // Replace timestamp placeholders
        content = content.replace(
          /Last updated: \d{4}-\d{2}-\d{2}/g,
          `Last updated: ${timestamp}`
        );
        
        // Write the updated content back to the file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated timestamp in ${filePath}`);
      } catch (error) {
        console.error(`Error updating ${filePath}:`, error);
      }
    }
  }
}

// Main execution
console.log('Updating documentation timestamps...');

// Update timestamps in the docs directory
const docsDir = path.join(process.cwd(), 'docs');
if (fs.existsSync(docsDir)) {
  updateTimestamps(docsDir);
} else {
  console.log('Docs directory not found, creating it...');
  fs.mkdirSync(docsDir, { recursive: true });
}

// Update timestamps in README.md if it exists
const readmePath = path.join(process.cwd(), 'README.md');
if (fs.existsSync(readmePath)) {
  console.log(`Updating timestamps in ${readmePath}`);
  
  try {
    let content = fs.readFileSync(readmePath, 'utf8');
    
    // Replace the timestamp placeholder with the current date
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Replace timestamp placeholders
    content = content.replace(
      /Last updated: \d{4}-\d{2}-\d{2}/g,
      `Last updated: ${timestamp}`
    );
    
    // Write the updated content back to the file
    fs.writeFileSync(readmePath, content, 'utf8');
    console.log(`✓ Updated timestamp in ${readmePath}`);
  } catch (error) {
    console.error(`Error updating ${readmePath}:`, error);
  }
}

console.log('Documentation timestamps updated successfully!');
