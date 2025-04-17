/**
 * Test script to investigate user object creation in Jira Insights
 * This script will:
 * 1. Get the schema ID for the "People" schema
 * 2. Get the object type ID for the "People" object type
 * 3. Inspect the attribute mappings for this object type
 * 4. Attempt to create a user with the correct attribute mappings
 */

import { JiraClient } from '../build/client/jira-client.js';
import { getAttributeMappings, getGlobalAttributeMappings } from '../build/utils/attribute-mapping-utils.js';
import { formatAttributes } from '../build/utils/attribute-utils.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Jira client
const jiraClient = new JiraClient({
  host: process.env.JIRA_HOST,
  email: process.env.JIRA_EMAIL,
  apiToken: process.env.JIRA_API_TOKEN
});

async function main() {
  try {
    console.log('Starting user creation test...');
    
    // Step 1: Get all schemas to find the People schema
    const assetsApi = await jiraClient.getAssetsApi();
    const schemas = await assetsApi.schemaList({
      startAt: 0,
      maxResults: 100
    });
    
    console.log(`Found ${schemas.values.length} schemas`);
    
    // Find the People schema
    const peopleSchema = schemas.values.find(schema => 
      schema.name.toLowerCase() === 'people' || 
      schema.name.toLowerCase().includes('people')
    );
    
    if (!peopleSchema) {
      console.error('People schema not found!');
      console.log('Available schemas:');
      schemas.values.forEach(schema => {
        console.log(`- ${schema.name} (ID: ${schema.id})`);
      });
      return;
    }
    
    console.log(`Found People schema: ${peopleSchema.name} (ID: ${peopleSchema.id})`);
    
    // Step 2: Get object types in the People schema
    const objectTypesResponse = await assetsApi.schemaFindAllObjectTypes({
      id: peopleSchema.id,
      startAt: 0,
      maxResults: 100
    });
    
    // Check the structure of the response
    console.log('Object types response structure:', JSON.stringify(objectTypesResponse, null, 2));
    
    // Handle different response formats
    const objectTypes = Array.isArray(objectTypesResponse) 
      ? objectTypesResponse 
      : (objectTypesResponse.values || []);
    
    console.log(`Found ${objectTypes.length} object types in the People schema`);
    
    // Find the People object type
    const peopleObjectType = objectTypes.find(objectType => 
      objectType.name.toLowerCase() === 'people' || 
      objectType.name.toLowerCase().includes('user') ||
      objectType.name.toLowerCase().includes('person')
    );
    
    if (!peopleObjectType) {
      console.error('People object type not found!');
      console.log('Available object types:');
      objectTypes.forEach(objectType => {
        console.log(`- ${objectType.name} (ID: ${objectType.id})`);
      });
      return;
    }
    
    console.log(`Found People object type: ${peopleObjectType.name} (ID: ${peopleObjectType.id})`);
    
    // Step 3: Get attribute mappings for the People object type
    console.log('Getting attribute mappings for People object type...');
    
    // First try global mappings
    console.log('Trying global attribute mappings first...');
    let globalMappings;
    try {
      globalMappings = await getGlobalAttributeMappings(jiraClient);
      console.log('Global attribute mappings:', globalMappings);
    } catch (error) {
      console.warn('Error getting global attribute mappings:', error);
    }
    
    // Then get object type specific mappings
    console.log('Getting object type specific mappings...');
    const attributeMappings = await getAttributeMappings(jiraClient, peopleObjectType.id);
    console.log('Attribute mappings for People object type:', attributeMappings);
    
    // Step 4: Get the object type definition and its attributes
    console.log('Getting object type definition and attributes...');
    
    // Get the object type definition
    const objectTypeDetails = await assetsApi.objectTypeFind({ id: peopleObjectType.id });
    console.log('Object type details:', JSON.stringify(objectTypeDetails, null, 2));
    
    // Get the attributes for this object type using the correct method from attribute-utils.ts
    console.log('Getting attributes for object type...');
    const attributesResponse = await assetsApi.objectTypeFindAllAttributes({ 
      id: peopleObjectType.id,
      onlyValueEditable: false,
      orderByName: false,
      query: '""',
      includeValuesExist: false,
      excludeParentAttributes: false,
      includeChildren: false,
      orderByRequired: false
    });
    
    console.log('Attributes response:', JSON.stringify(attributesResponse, null, 2));
    
    // Extract the attributes - handle both array and object with values property
    const objectTypeAttributes = Array.isArray(attributesResponse) 
      ? attributesResponse 
      : (attributesResponse.values || []);
    
    // Log the attributes
    console.log(`Found ${objectTypeAttributes.length} attributes for People object type:`);
    if (objectTypeAttributes.length > 0) {
      objectTypeAttributes.forEach(attr => {
        console.log(`- ${attr.name} (ID: ${attr.id}, Required: ${attr.required || false})`);
      });
    } else {
      console.log('No attributes found for this object type.');
    }
    
    // Find the name attribute
    const nameAttribute = objectTypeAttributes.find(attr => 
      attr.name && (
        attr.name.toLowerCase() === 'name' || 
        attr.name.toLowerCase() === 'full name' ||
        attr.name.toLowerCase() === 'username'
      )
    );
    
    // Find required attributes
    const requiredAttributes = objectTypeAttributes.filter(attr => attr.required);
    console.log('Required attributes:', requiredAttributes.map(attr => `${attr.name} (ID: ${attr.id})`));
    
    // Determine the name attribute ID
    let nameAttributeId;
    if (nameAttribute) {
      nameAttributeId = nameAttribute.id;
      console.log(`Found name attribute: ${nameAttribute.name} (ID: ${nameAttributeId})`);
    } else {
      // Fall back to the common ID if we can't find the name attribute
      nameAttributeId = '174';
      console.log(`Name attribute not found, falling back to default ID: ${nameAttributeId}`);
      console.log('Available attributes:');
      objectTypeAttributes.forEach(attr => {
        if (attr && attr.name) {
          console.log(`- ${attr.name} (ID: ${attr.id})`);
        }
      });
    }
    
    // Step 5: Attempt to create a user with the correct attribute mappings
    console.log('Attempting to create a user...');
    
    // Based on the error message, we know that:
    // 1. The attribute ID "174" is not valid for the People object type
    // 2. There's a required attribute with ID "rlabs-insight-attribute-198" that needs to be set
    
    // Let's try to create a user with both attributes
    const attributesArray = [
      // Use the required attribute ID from the error message
      {
        objectTypeAttributeId: "rlabs-insight-attribute-198",
        objectAttributeValues: [
          {
            value: "Rick Astley"
          }
        ]
      }
    ];
    
    console.log(`Added required attribute (ID: rlabs-insight-attribute-198) with value: Rick Astley`);
    
    const createParams = {
      requestBody: {
        objectTypeId: peopleObjectType.id,
        attributes: attributesArray,
      },
    };
    
    console.log('User create params:', JSON.stringify(createParams, null, 2));
    
    try {
      const newUser = await assetsApi.objectCreate(createParams);
      console.log('User created successfully:', JSON.stringify(newUser, null, 2));
    } catch (error) {
      console.error('Error creating user:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

main();
