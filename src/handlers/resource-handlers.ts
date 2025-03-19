import { JiraClient } from '../client/jira-client.js';

/**
 * Set up resource handlers for the MCP server
 * @param jiraClient The Jira client instance
 * @returns Object containing resource handler functions
 */
export function setupResourceHandlers(jiraClient: JiraClient) {
  /**
   * List available resources
   */
  const listResources = async () => {
    return {
      resources: [
        {
          uri: `jira-insights://instance/summary`,
          name: `Jira Insights Instance Summary`,
          mimeType: 'application/json',
          description: 'High-level statistics about the Jira Insights instance',
        },
      ],
    };
  };

  /**
   * List available resource templates
   */
  const listResourceTemplates = async () => {
    return {
      resourceTemplates: [
        {
          uriTemplate: 'jira-insights://schemas/{schemaId}/overview',
          name: 'Schema Overview',
          mimeType: 'application/json',
          description: 'Overview of a specific schema including metadata and statistics',
        },
        {
          uriTemplate: 'jira-insights://object-types/{objectTypeId}/overview',
          name: 'Object Type Overview',
          mimeType: 'application/json',
          description: 'Overview of a specific object type including attributes and statistics',
        },
      ],
    };
  };

  /**
   * Read a resource
   * @param uri The resource URI
   * @returns The resource content
   */
  const readResource = async (uri: string) => {
    // Instance summary resource
    if (uri === 'jira-insights://instance/summary') {
      try {
        // Get list of schemas to provide summary information
        const assetsApi = await jiraClient.getAssetsApi();
        const schemaList = await assetsApi.schemaList();
        const schemas = schemaList.values || [];

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  instance: jiraClient.getConfig().host,
                  schemas: {
                    count: schemas.length,
                    names: schemas.map((schema: unknown) => {
                      const typedSchema = schema as { name: string };
                      return typedSchema.name;
                    }),
                  },
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error('Error fetching instance summary:', error);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'Failed to fetch instance summary',
                  message: (error as Error).message,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    // Schema overview resource
    const schemaMatch = uri.match(/^jira-insights:\/\/schemas\/([^/]+)\/overview$/);
    if (schemaMatch) {
      const schemaId = decodeURIComponent(schemaMatch[1]);
      try {
        const assetsApi = await jiraClient.getAssetsApi();
        const schema = await assetsApi.getSchema({ id: schemaId }) as { 
          id: string; 
          name: string; 
          description: string;
        };
        const objectTypesList = await assetsApi.getObjectTypes({ schemaId });
        const objectTypes = objectTypesList.values || [];

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  id: schema.id,
                  name: schema.name,
                  description: schema.description,
                  objectTypes: {
                    count: objectTypes.length,
                    items: objectTypes.map((type: unknown) => {
                      const typedType = type as { id: string; name: string };
                      return {
                        id: typedType.id,
                        name: typedType.name,
                      };
                    }),
                  },
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error(`Error fetching schema overview for ${schemaId}:`, error);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: `Failed to fetch schema overview for ${schemaId}`,
                  message: (error as Error).message,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    // Object type overview resource
    const objectTypeMatch = uri.match(/^jira-insights:\/\/object-types\/([^/]+)\/overview$/);
    if (objectTypeMatch) {
      const objectTypeId = decodeURIComponent(objectTypeMatch[1]);
      try {
        const assetsApi = await jiraClient.getAssetsApi();
        const objectType = await assetsApi.getObjectType({ id: objectTypeId }) as {
          id: string;
          name: string;
          description: string;
          objectSchemaId: string;
        };
        const attributesList = await assetsApi.getObjectTypeAttributes({ objectTypeId });
        const attributes = attributesList.values || [];

        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  id: objectType.id,
                  name: objectType.name,
                  description: objectType.description,
                  schemaId: objectType.objectSchemaId,
                  attributes: {
                    count: attributes.length,
                    items: attributes.map((attr: unknown) => {
                      const typedAttr = attr as {
                        id: string;
                        name: string;
                        type: string;
                        required: boolean;
                      };
                      return {
                        id: typedAttr.id,
                        name: typedAttr.name,
                        type: typedAttr.type,
                        required: typedAttr.required,
                      };
                    }),
                  },
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error(`Error fetching object type overview for ${objectTypeId}:`, error);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: `Failed to fetch object type overview for ${objectTypeId}`,
                  message: (error as Error).message,
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }

    // Unknown resource
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              error: 'Resource not found',
              uri,
            },
            null,
            2
          ),
        },
      ],
    };
  };

  return {
    listResources,
    listResourceTemplates,
    readResource,
  };
}
