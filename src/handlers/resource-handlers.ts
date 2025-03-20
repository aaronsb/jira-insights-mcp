import { JiraClient } from '../client/jira-client.js';

// Cache for the imports schema definition
let cachedImportsSchema: any = null;

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
          uri: 'jira-insights://instance/summary',
          name: 'Jira Insights Instance Summary',
          mimeType: 'application/json',
          description: 'High-level statistics about the Jira Insights instance',
        },
        {
          uri: 'jira-insights://aql-syntax',
          name: 'AQL Syntax Guide',
          mimeType: 'application/json',
          description: 'Comprehensive guide to Assets Query Language (AQL) syntax with examples',
        },
        {
          uri: 'jira-insights://imports-schema-definition',
          name: 'Imports Schema and Mapping Definition (Full Schema)',
          mimeType: 'application/json',
          description: 'Complete JSON schema definition for Imports Schema and Mapping (large reference document)',
        },
        {
          uri: 'jira-insights://imports-schema-definition/docs',
          name: 'Imports Schema and Mapping Documentation',
          mimeType: 'application/json',
          description: 'User-friendly documentation of the Imports Schema with examples and explanations',
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
   * Get the imports schema definition (fetches and caches on first call)
   * @returns The imports schema definition
   */
  const getImportsSchema = async () => {
    if (cachedImportsSchema) {
      return cachedImportsSchema;
    }

    try {
      console.error('Fetching imports schema definition from Atlassian API...');
      const fetch = (await import('node-fetch')).default;
      const response = await fetch('https://api.atlassian.com/jsm/insight/imports/external/schema/versions/2023_10_19');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
      }
      
      cachedImportsSchema = await response.json();
      console.error('Imports schema definition cached successfully');
      return cachedImportsSchema;
    } catch (error) {
      console.error('Error fetching imports schema definition:', error);
      throw error;
    }
  };

  /**
   * Generate documentation from schema
   * @param schema The JSON schema to document
   * @returns Structured documentation object
   */
  const generateSchemaDocumentation = (schema: any) => {
    // Extract schema metadata
    const schemaId = schema.$id || '';
    const schemaVersion = schemaId.split('/').pop() || '';
    const schemaTitle = schema.title || 'Imports Schema and Mapping Definition';
    const schemaDescription = schema.description || '';
    
    // Extract required properties
    const requiredProperties = schema.required || [];
    
    // Extract property definitions
    const propertyDefs = Object.entries(schema.properties || {}).map(([name, def]: [string, any]) => {
      return {
        name,
        description: def.description || '',
        required: requiredProperties.includes(name),
        type: def.type || '',
        properties: def.properties ? Object.keys(def.properties) : [],
        required_properties: def.required || []
      };
    });
    
    // Extract definitions
    const definitions = Object.entries(schema.$defs || {}).map(([name, def]: [string, any]) => {
      const defRequired = (def as any).required || [];
      
      return {
        name,
        description: (def as any).description || `Definition for ${name}`,
        required: defRequired,
        properties: Object.entries((def as any).properties || {}).map(([propName, propDef]: [string, any]) => {
          return {
            name: propName,
            description: propDef.description || '',
            required: defRequired.includes(propName),
            type: propDef.type || (propDef.enum ? 'enum' : ''),
            enum: propDef.enum || [],
            format: propDef.format || null,
            pattern: propDef.pattern || null,
            minimum: propDef.minimum || null,
            maximum: propDef.maximum || null,
            minLength: propDef.minLength || null,
            maxLength: propDef.maxLength || null
          };
        })
      };
    });
    
    // Build documentation structure
    return {
      title: schemaTitle,
      description: schemaDescription,
      version: schemaVersion,
      last_updated: new Date().toISOString(),
      reference_schema_endpoint: 'jira-insights://imports-schema-definition',
      overview: {
        introduction: schemaDescription,
        structure: `The schema consists of ${propertyDefs.length} main sections: ${propertyDefs.map(p => `'${p.name}'`).join(', ')}.`,
        definitions_count: definitions.length
      },
      main_sections: propertyDefs,
      definitions: definitions
    };
  };

  /**
   * Read a resource
   * @param uri The resource URI
   * @returns The resource content
   */
  const readResource = async (uri: string) => {
    // AQL syntax resource
    if (uri === 'jira-insights://aql-syntax') {
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                title: 'Assets Query Language (AQL) Syntax Guide',
                description: 'AQL is a powerful query language used in Jira Insights to search, filter, and retrieve objects.',
                basicSyntax: {
                  pattern: '<attribute> <operator> <value/function>',
                  example: 'Owner = "Ted Anderson"',
                  description: 'Returns all objects where the Owner is Ted Anderson'
                },
                guidelines: [
                  'AQL is not case-sensitive',
                  'Values with spaces must be enclosed in quotes: "Ted Anderson"',
                  'Escape quotes with backslashes: 15\\" Screen',
                  'Attribute names must exist in your schema'
                ],
                dotNotation: {
                  pattern: '<attribute>.<attribute> <operator> <value/function>',
                  example: '"Belongs to Department".Name = HR',
                  description: 'Traverses reference chains to find objects based on related objects'
                },
                keywords: [
                  {
                    keyword: 'objectSchema',
                    example: 'objectSchema = "ITSM Schema"',
                    description: 'Limits search to a specific object schema'
                  },
                  {
                    keyword: 'objectType',
                    example: 'objectType = "Employee"',
                    description: 'Limits search to a specific object type'
                  },
                  {
                    keyword: 'objectId',
                    example: 'objectId = 1111',
                    description: 'Finds an object by ID (number from the Key without prefix)'
                  },
                  {
                    keyword: 'Key',
                    example: 'Key = "ITSM-1111"',
                    description: 'Finds an object by its unique key'
                  }
                ],
                operators: [
                  {
                    operator: '=',
                    description: 'Equality (case insensitive)',
                    example: 'Office = Stockholm'
                  },
                  {
                    operator: '==',
                    description: 'Equality (case sensitive)',
                    example: 'Office == Stockholm'
                  },
                  {
                    operator: '!=',
                    description: 'Inequality',
                    example: 'Office != Stockholm'
                  },
                  {
                    operator: '<, >, <=, >=',
                    description: 'Comparison operators',
                    example: 'Price > 2000'
                  },
                  {
                    operator: 'like',
                    description: 'Contains substring (case insensitive)',
                    example: 'Office like Stock'
                  },
                  {
                    operator: 'not like',
                    description: 'Does not contain substring',
                    example: 'Office not like Stock'
                  },
                  {
                    operator: 'in()',
                    description: 'Matches any value in list',
                    example: 'Office in (Stockholm, Oslo, "San Jose")'
                  },
                  {
                    operator: 'not in()',
                    description: 'Matches no values in list',
                    example: 'Office not in (Stockholm, Oslo)'
                  },
                  {
                    operator: 'startswith',
                    description: 'Begins with string (case insensitive)',
                    example: 'Office startsWith St'
                  },
                  {
                    operator: 'endswith',
                    description: 'Ends with string (case insensitive)',
                    example: 'Office endsWith holm'
                  },
                  {
                    operator: 'is EMPTY',
                    description: 'Tests if value exists',
                    example: 'Office is EMPTY'
                  },
                  {
                    operator: 'is not EMPTY',
                    description: 'Tests if value exists',
                    example: 'Office is not EMPTY'
                  },
                  {
                    operator: 'having',
                    description: 'Used with reference functions',
                    example: 'object having inboundReferences()'
                  }
                ],
                combinationOperators: [
                  {
                    operator: 'AND',
                    example: 'objectType = "Host" AND "Operating System" = "Ubuntu"'
                  },
                  {
                    operator: 'OR',
                    example: 'Status = "Active" OR Status = "Pending"'
                  }
                ],
                functions: [
                  {
                    category: 'Date and Time',
                    functions: ['now()', 'startOfDay()', 'endOfDay()', 'startOfMonth()', 'endOfMonth()'],
                    example: 'Created > now(-2h 15m)'
                  },
                  {
                    category: 'User',
                    functions: ['currentUser()', 'currentReporter()', 'user()'],
                    example: 'User = currentUser()'
                  },
                  {
                    category: 'Group',
                    function: 'group()',
                    example: 'User in group("jira-users")'
                  },
                  {
                    category: 'Project',
                    function: 'currentProject()',
                    example: 'Project = currentProject()'
                  }
                ],
                referenceFunctions: [
                  {
                    function: 'inboundReferences(AQL)',
                    shorthand: 'inR(AQL)',
                    description: 'Filters objects with inbound references matching the AQL',
                    example: 'object having inboundReferences(Name="John")'
                  },
                  {
                    function: 'outboundReferences(AQL)',
                    shorthand: 'outR(AQL)',
                    description: 'Filters objects with outbound references matching the AQL',
                    example: 'object having outboundReferences(objectType="Employee")'
                  },
                  {
                    function: 'connectedTickets(JQL)',
                    description: 'Filters objects with connected Jira tickets matching the JQL',
                    example: 'object having connectedTickets(Project = VK)'
                  },
                  {
                    function: 'objectTypeAndChildren(Name)',
                    description: 'Filters objects of specified type and its children',
                    example: 'objectType in objectTypeAndChildren("Asset Details")'
                  }
                ],
                ordering: {
                  syntax: 'order by [AttributeName|label] [asc|desc]',
                  example: 'objectType = "Employee" order by Name desc',
                  notes: [
                    'Default order is ascending by label',
                    'Reference attributes can use dot notation: order by Employee.Department',
                    'Missing values appear at top in ascending order',
                    'Use "label" to order by configured object label'
                  ]
                },
                complexExamples: [
                  {
                    description: 'Find all employees in the HR department with manager access',
                    query: 'objectType = "Employee" AND "Department".Name = "HR" AND "Access Level" = "Manager"'
                  },
                  {
                    description: 'Find all servers with critical patches missing',
                    query: 'objectType = "Server" AND "Patch Status" = "Critical Missing" AND "Environment" in ("Production", "Staging")'
                  },
                  {
                    description: 'Find all assets assigned to the current user with warranty expiring this year',
                    query: 'objectType = "Asset" AND "Assigned To" = currentUser() AND "Warranty End" < endOfYear() AND "Warranty End" > startOfYear()'
                  }
                ]
              },
              null,
              2
            ),
          },
        ],
      };
    }
    
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
        const schema = await assetsApi.schemaFind({ id: schemaId }) as { 
          id: string; 
          name: string; 
          description: string;
        };
        const objectTypesList = await assetsApi.schemaFindAllObjectTypes({ 
          id: schemaId,
          excludeAbstract: false
        });
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
        const objectType = await assetsApi.objectTypeFind({ id: objectTypeId }) as {
          id: string;
          name: string;
          description: string;
          objectSchemaId: string;
        };
        const attributesList = await assetsApi.objectTypeFindAllAttributes({ 
          id: objectTypeId,
          onlyValueEditable: false,
          orderByName: false,
          query: '""',
          includeValuesExist: false,
          excludeParentAttributes: false,
          includeChildren: false,
          orderByRequired: false
        });
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

    // Imports schema definition resource (full schema)
    if (uri === 'jira-insights://imports-schema-definition') {
      try {
        // Use the cached schema
        const schemaData = await getImportsSchema();
        
        // Add metadata with instructions
        const enhancedSchema = {
          _metadata: {
            notice: 'This is a large reference document containing the complete JSON schema. For a more digestible format with examples and explanations, use the documentation endpoint instead.',
            documentation_endpoint: 'jira-insights://imports-schema-definition/docs',
            schema_version: '2023_10_19',
            last_updated: new Date().toISOString()
          },
          ...schemaData
        };
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(enhancedSchema, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error providing imports schema definition:', error);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'Failed to provide imports schema definition',
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
    
    // Imports schema documentation resource
    if (uri === 'jira-insights://imports-schema-definition/docs') {
      try {
        // Use the cached schema to build documentation
        const schemaData = await getImportsSchema();
        
        // Generate documentation dynamically from the schema
        const documentation = generateSchemaDocumentation(schemaData);
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(documentation, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error('Error providing imports schema documentation:', error);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: 'Failed to provide imports schema documentation',
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
