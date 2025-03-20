import { JiraClient } from '../client/jira-client.js';
import { SchemaCacheManager } from '../utils/schema-cache-manager.js';

// Cache for the imports schema definition
let cachedImportsSchema: any = null;

/**
 * Set up resource handlers for the MCP server
 * @param jiraClient The Jira client instance
 * @param schemaCacheManager The schema cache manager instance
 * @returns Object containing resource handler functions
 */
export function setupResourceHandlers(jiraClient: JiraClient, schemaCacheManager: SchemaCacheManager) {
  /**
   * List available resources
   */
  const listResources = async () => {
    // Wait for schema cache to be initialized
    await schemaCacheManager.waitForInitialization();
    
    // Get all schemas to list them as resources
    const schemas = schemaCacheManager.getAllSchemas();
    
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
        // Add a new resource for all schemas
        {
          uri: 'jira-insights://schemas/all',
          name: 'All Jira Insights Schemas',
          mimeType: 'application/json',
          description: 'Complete list of all schemas with their object types',
        },
        // Add individual schema resources
        ...schemas.map((schema: any) => ({
          uri: `jira-insights://schemas/${schema.id}/full`,
          name: `Schema: ${schema.name}`,
          mimeType: 'application/json',
          description: `Complete definition of the "${schema.name}" schema including object types`,
        })),
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
        // Add new resource templates
        {
          uriTemplate: 'jira-insights://schemas/{schemaId}/aql-examples',
          name: 'Schema AQL Examples',
          mimeType: 'application/json',
          description: 'Example AQL queries for a specific schema',
        },
        {
          uriTemplate: 'jira-insights://object-types/{objectTypeId}/template',
          name: 'Object Type Template',
          mimeType: 'application/json',
          description: 'Template for creating objects of a specific type',
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
    // Handle all schemas resource
    if (uri === 'jira-insights://schemas/all') {
      // Wait for schema cache to be initialized
      await schemaCacheManager.waitForInitialization();
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                schemas: schemaCacheManager.getAllSchemas(),
                timestamp: new Date().toISOString(),
              },
              null,
              2
            ),
          },
        ],
      };
    }
    
    // Handle individual schema full resource
    const schemaFullMatch = uri.match(/^jira-insights:\/\/schemas\/([^/]+)\/full$/);
    if (schemaFullMatch) {
      // Wait for schema cache to be initialized
      await schemaCacheManager.waitForInitialization();
      
      const schemaId = decodeURIComponent(schemaFullMatch[1]);
      const schema = schemaCacheManager.getSchema(schemaId);
      
      if (!schema) {
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: `Schema not found: ${schemaId}`,
                },
                null,
                2
              ),
            },
          ],
        };
      }
      
      // Always fetch the object types directly for the full schema resource
      try {
        const assetsApi = await jiraClient.getAssetsApi();
        console.error(`Fetching object types for schema ${schemaId}...`);
        const objectTypesList = await assetsApi.schemaFindAllObjectTypes({ 
          id: schemaId,
          excludeAbstract: false
        });
        
        console.error('Object types list response:', JSON.stringify(objectTypesList, null, 2));
        
        // Create an enhanced schema with object types
        const objectTypes = objectTypesList.values || [];
        const enhancedSchema = {
          ...schema,
          objectTypes: objectTypes,
          _objectTypesCount: objectTypes.length,
          _fetchedAt: new Date().toISOString()
        };
        
        console.error(`Fetched ${objectTypes.length} object types for schema ${schemaId}`);
        
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
        console.error(`Error fetching object types for schema ${schemaId}:`, error);
        
        // Return the schema without object types if there was an error
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                ...schema,
                _error: 'Failed to fetch object types',
                _errorMessage: (error as Error).message
              }, null, 2),
            },
          ],
        };
      }
    }
    
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
                ],
                // Add new section for common errors and solutions
                commonErrors: [
                  {
                    error: 'Validation error',
                    cause: 'Missing quotes around values with spaces',
                    example: 'Name = John Doe',
                    solution: 'Add quotes: Name = "John Doe"'
                  },
                  {
                    error: 'Validation error',
                    cause: 'Using lowercase logical operators',
                    example: 'objectType = "Server" and Status = "Active"',
                    solution: 'Use uppercase: objectType = "Server" AND Status = "Active"'
                  },
                  {
                    error: 'Object type not found',
                    cause: 'Referencing a non-existent object type',
                    example: 'objectType = "NonExistentType"',
                    solution: 'Check available object types in your schema'
                  },
                  {
                    error: 'Attribute not found',
                    cause: 'Referencing a non-existent attribute',
                    example: 'NonExistentAttribute = "Value"',
                    solution: 'Check available attributes for the object type'
                  }
                ],
                
                // Add new section for query building tips
                queryBuildingTips: [
                  'Start with simple queries and add complexity gradually',
                  'Test each condition separately before combining them',
                  'Use objectType = "X" as the first condition to narrow down results',
                  'When using referenced objects, ensure the reference chain exists',
                  'For complex queries, break them down into smaller parts'
                ]
              },
              null,
              2
            ),
          },
        ],
      };
    }
    // AQL examples by schema resource
    const aqlExamplesBySchemaMatch = uri.match(/^jira-insights:\/\/schemas\/([^/]+)\/aql-examples$/);
    if (aqlExamplesBySchemaMatch) {
      const schemaId = decodeURIComponent(aqlExamplesBySchemaMatch[1]);
      
      try {
        // Wait for schema cache to be initialized
        await schemaCacheManager.waitForInitialization();
        
        const schema = schemaCacheManager.getSchema(schemaId);
        
        if (!schema) {
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(
                  {
                    error: `Schema not found: ${schemaId}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
        
        // Get object types for this schema
        const objectTypes = schema.objectTypes || [];
        
        // Generate examples based on object types
        const examples = [];
        
        // Add basic examples for each object type
        for (const objectType of objectTypes) {
          examples.push({
            description: `Find all ${objectType.name} objects`,
            aql: `objectType = "${objectType.name}"`,
            complexity: 'basic'
          });
        }
        
        // Add some more complex examples if there are object types
        if (objectTypes.length > 0) {
          examples.push({
            description: 'Find objects with a specific status',
            aql: `objectType = "${objectTypes[0].name}" AND Status = "Active"`,
            complexity: 'intermediate'
          });
          
          examples.push({
            description: 'Find objects with a specific attribute containing text',
            aql: `objectType = "${objectTypes[0].name}" AND Name like "Test"`,
            complexity: 'intermediate'
          });
          
          examples.push({
            description: 'Find objects with multiple conditions',
            aql: `objectType = "${objectTypes[0].name}" AND Status = "Active" AND Created > now(-30d)`,
            complexity: 'advanced'
          });
        }
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  schemaId,
                  schemaName: schema.name,
                  examples,
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error(`Error generating AQL examples for schema ${schemaId}:`, error);
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: `Failed to generate AQL examples for schema ${schemaId}`,
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

    // Object type template resource
    const objectTypeTemplateMatch = uri.match(/^jira-insights:\/\/object-types\/([^/]+)\/template$/);
    if (objectTypeTemplateMatch) {
      const objectTypeId = decodeURIComponent(objectTypeTemplateMatch[1]);
      
      try {
        const assetsApi = await jiraClient.getAssetsApi();
        const objectType = await assetsApi.objectTypeFind({ id: objectTypeId }) as {
          id: string;
          name: string;
          description: string;
          objectSchemaId: string;
        };
        
        // Get attributes for this object type
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
        
        // Generate template object
        const template: Record<string, any> = {
          name: `[${objectType.name} Name]`,
        };
        
        // Generate template values for each attribute
        attributes.forEach((attr: any) => {
          let placeholder;
          
          switch(attr.type) {
          case 'TEXT':
            placeholder = `[${attr.name} text]`;
            break;
          case 'INTEGER':
            placeholder = 0;
            break;
          case 'FLOAT':
            placeholder = 0.0;
            break;
          case 'DATE':
            placeholder = new Date().toISOString().split('T')[0];
            break;
          case 'DATETIME':
            placeholder = new Date().toISOString();
            break;
          case 'BOOLEAN':
            placeholder = false;
            break;
          case 'REFERENCE':
            placeholder = {
              objectTypeId: attr.referenceObjectTypeId,
              objectMappingIQL: `[Referenced ${attr.name} AQL query]`
            };
            break;
          default:
            placeholder = `[${attr.name}]`;
          }
          
          template[attr.name] = placeholder;
        });
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  objectTypeId,
                  objectTypeName: objectType.name,
                  schemaId: objectType.objectSchemaId,
                  template,
                  _attributesCount: attributes.length,
                  _generatedAt: new Date().toISOString(),
                  usage: {
                    description: 'This template provides a starting point for creating objects of this type.',
                    notes: [
                      'Replace placeholder values with actual data',
                      'Required attributes must be provided',
                      'For reference attributes, provide a valid AQL query or object ID'
                    ]
                  }
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        console.error(`Error generating template for object type ${objectTypeId}:`, error);
        
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  error: `Failed to generate template for object type ${objectTypeId}`,
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
