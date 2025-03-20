// Test script for API operations
const { execSync } = require('child_process');

// Configuration
const HOST = process.env.JIRA_HOST || 'https://your-domain.atlassian.net';
const EMAIL = process.env.JIRA_EMAIL || 'your-email@example.com';
const API_TOKEN = process.env.JIRA_API_TOKEN || 'your-api-token';

// Test schema operations
console.log('Testing schema operations...');
execSync(`JIRA_HOST=${HOST} JIRA_EMAIL=${EMAIL} JIRA_API_TOKEN=${API_TOKEN} node -e "
  const { initAssetsApiClient } = require('jira-insights-api');
  
  async function testSchemaOperations() {
    try {
      const instance = '${HOST}'.match(/https?:\\/\\/([^/]+)/)[1].split('.')[0];
      const client = await initAssetsApiClient({
        email: '${EMAIL}',
        apiToken: '${API_TOKEN}',
        instance
      });
      
      console.log('Listing schemas...');
      const schemas = await client.DefaultService.schemaList({ maxResults: 10 });
      console.log(\`Found \${schemas.values.length} schemas\`);
      
      if (schemas.values.length > 0) {
        const schemaId = schemas.values[0].id;
        console.log(\`Getting schema \${schemaId}...\`);
        const schema = await client.DefaultService.schemaFind({ id: schemaId });
        console.log(\`Schema name: \${schema.name}\`);
        
        console.log(\`Listing object types for schema \${schemaId}...\`);
        const objectTypes = await client.DefaultService.schemaFindAllObjectTypes({ 
          id: schemaId,
          excludeAbstract: false
        });
        console.log(\`Found \${objectTypes.values.length} object types\`);
        
        if (objectTypes.values.length > 0) {
          const objectTypeId = objectTypes.values[0].id;
          console.log(\`Getting object type \${objectTypeId}...\`);
          const objectType = await client.DefaultService.objectTypeFind({ id: objectTypeId });
          console.log(\`Object type name: \${objectType.name}\`);
          
          console.log(\`Listing attributes for object type \${objectTypeId}...\`);
          const attributes = await client.DefaultService.objectTypeFindAllAttributes({ 
            id: objectTypeId,
            onlyValueEditable: false,
            orderByName: false,
            query: '\"\"',
            includeValuesExist: false,
            excludeParentAttributes: false,
            includeChildren: false,
            orderByRequired: false
          });
          console.log(\`Found \${attributes.values.length} attributes\`);
          
          console.log('Testing AQL query...');
          try {
            const aql = \`objectType = \${objectTypeId}\`;
            console.log(\`Query: \${aql}\`);
            const objects = await client.DefaultService.objectsByAql({
              requestBody: {
                aql
              },
              startAt: 0,
              maxResults: 10,
              includeAttributes: true
            });
            console.log(\`Found \${objects.values.length} objects\`);
          } catch (error) {
            console.error('AQL query error:', error.message);
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  testSchemaOperations();
"`, { stdio: 'inherit' });
