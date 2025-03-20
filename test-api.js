import { initAssetsApiClient } from 'jira-insights-api';

// This script is just to explore the API structure
async function exploreApi() {
  try {
    // We don't need valid credentials for this test
    const client = await initAssetsApiClient({
      email: 'test@example.com',
      apiToken: 'test-token',
      instance: 'test-instance',
    });
    
    // Log the structure of the client
    console.log('Client structure:');
    console.log(Object.keys(client));
    
    if (client.DefaultService) {
      console.log('\nDefaultService methods:');
      
      // Get all properties including non-enumerable ones
      console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client.DefaultService)));
      
      // Log all properties of the DefaultService object
      console.log('\nDefaultService properties:');
      console.log(Object.getOwnPropertyNames(client.DefaultService));
      
      // Try to inspect the OpenAPI object
      if (client.OpenAPI) {
        console.log('\nOpenAPI structure:');
        console.log(Object.keys(client.OpenAPI));
      }
      
      // Log the entire DefaultService object
      console.log('\nFull DefaultService object:');
      console.log(client.DefaultService);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

exploreApi();
