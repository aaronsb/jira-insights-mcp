import { initAssetsApiClient } from 'jira-insights-api';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables from .env file if it exists
if (fs.existsSync('.env')) {
  dotenv.config();
}

/**
 * This script initializes the Jira Insights API client and logs all available methods
 * to help understand the API structure.
 */
async function exploreApiMethods() {
  try {
    // Get API credentials from environment variables or use placeholders
    const email = process.env.JIRA_EMAIL || 'test@example.com';
    const apiToken = process.env.JIRA_API_TOKEN || 'test-token';
    const instance = process.env.JIRA_HOST?.match(/https?:\/\/([^.]+)/)?.[1] || 'test-instance';

    console.log('Initializing Jira Insights API client...');
    console.log(`Using instance: ${instance}`);

    // Initialize the client
    const insightClient = await initAssetsApiClient({
      email,
      apiToken,
      instance
    });

    console.log('\n=== Jira Insights API Client Structure ===');
    console.log('Top-level properties:');
    console.log(Object.keys(insightClient));

    // Explore DefaultService
    if (insightClient.DefaultService) {
      console.log('\n=== DefaultService Properties ===');
      
      // Get all properties including methods
      const properties = getAllProperties(insightClient.DefaultService);
      console.log(properties);
      
      // Log methods in more detail
      console.log('\n=== DefaultService Methods ===');
      properties.forEach(prop => {
        const value = insightClient.DefaultService[prop];
        if (typeof value === 'function') {
          try {
            // Try to get the function's string representation to see parameters
            console.log(`${prop}: ${value.toString().split('\n')[0]}`);
          } catch (e) {
            console.log(`${prop}: [Function]`);
          }
        }
      });
    }

    // Explore OpenAPI if it exists
    if (insightClient.OpenAPI) {
      console.log('\n=== OpenAPI Properties ===');
      console.log(Object.keys(insightClient.OpenAPI));
    }

    // Check for any other services
    Object.keys(insightClient).forEach(key => {
      if (key !== 'DefaultService' && key !== 'OpenAPI' && typeof insightClient[key] === 'object') {
        console.log(`\n=== ${key} Properties ===`);
        console.log(Object.keys(insightClient[key]));
      }
    });

  } catch (error) {
    console.error('Error exploring API methods:', error);
  }
}

/**
 * Get all properties of an object, including non-enumerable ones
 * @param obj The object to inspect
 * @returns Array of property names
 */
function getAllProperties(obj) {
  const props = new Set();
  
  // Get own properties
  Object.getOwnPropertyNames(obj).forEach(prop => props.add(prop));
  
  // Get properties from prototype chain
  let proto = Object.getPrototypeOf(obj);
  while (proto && proto !== Object.prototype) {
    Object.getOwnPropertyNames(proto).forEach(prop => {
      // Filter out common Object prototype methods
      if (prop !== 'constructor' && 
          prop !== '__defineGetter__' && 
          prop !== '__defineSetter__' && 
          prop !== 'hasOwnProperty' && 
          prop !== '__lookupGetter__' && 
          prop !== '__lookupSetter__' && 
          prop !== 'isPrototypeOf' && 
          prop !== 'propertyIsEnumerable' && 
          prop !== 'toString' && 
          prop !== 'valueOf' && 
          prop !== 'toLocaleString') {
        props.add(prop);
      }
    });
    proto = Object.getPrototypeOf(proto);
  }
  
  return Array.from(props);
}

// Run the function
exploreApiMethods();
