import { JiraClient } from '../client/jira-client.js';
import { SchemaContext } from '../types/index.js';

// Cache for schema contexts
interface CacheEntry {
  data: SchemaContext;
  timestamp: number;
}

// Cache expiration time (1 hour)
const CACHE_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Schema Cache Manager class for caching and retrieving schema contexts
 */
export class SchemaCacheManager {
  private schemaCache: Map<string, CacheEntry>;
  private allSchemas: any[] = [];
  private initialized = false;
  private jiraClient: JiraClient;
  
  constructor(jiraClient: JiraClient) {
    this.schemaCache = new Map<string, CacheEntry>();
    this.jiraClient = jiraClient;
    
    // Start initialization in the background
    this.initialize().catch(error => {
      console.error('Error initializing schema cache:', error);
    });
  }
  
  /**
   * Initialize the schema cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      const assetsApi = await this.jiraClient.getAssetsApi();
      const schemas = await assetsApi.schemaFindAll();
      this.allSchemas = schemas.values || [];
      this.initialized = true;
      console.log(`Initialized schema cache with ${this.allSchemas.length} schemas`);
    } catch (error) {
      console.error('Error initializing schema cache:', error);
      throw error;
    }
  }
  
  /**
   * Wait for the schema cache to be initialized
   */
  async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // In a real implementation, this would wait for initialization to complete
    // For now, we'll just return a resolved promise
    return Promise.resolve();
  }
  
  /**
   * Get all schemas
   * @returns All schemas
   */
  getAllSchemas(): any[] {
    return this.allSchemas;
  }
  
  /**
   * Get a schema by ID
   * @param schemaId The schema ID
   * @returns The schema or undefined if not found
   */
  getSchema(schemaId: string): any {
    return this.allSchemas.find(schema => schema.id === schemaId);
  }
  
  /**
   * Check if a cache entry is expired
   * @param timestamp The timestamp of the cache entry
   * @returns Whether the cache entry is expired
   */
  private isCacheExpired(timestamp: number): boolean {
    return Date.now() - timestamp > CACHE_EXPIRATION_MS;
  }
  
  /**
   * Get schema context for validation
   * @param schemaId The schema ID to get context for
   * @param jiraClient The Jira client instance
   * @returns The schema context
   */
  async getSchemaForValidation(
    schemaId: string,
    jiraClient: JiraClient
  ): Promise<SchemaContext> {
    // Check cache first
    const cachedSchema = this.schemaCache.get(schemaId);
    if (cachedSchema && !this.isCacheExpired(cachedSchema.timestamp)) {
      console.log(`Using cached schema context for schema ${schemaId}`);
      return cachedSchema.data;
    }
    
    console.log(`Fetching schema context for schema ${schemaId}`);
    
    // Fetch schema details if not in cache
    const assetsApi = await jiraClient.getAssetsApi();
    const schema = await assetsApi.schemaFind({ id: schemaId });
    
    // Fetch object types for this schema
    const objectTypes = await assetsApi.objectTypesBySchema({
      schemaId,
      maxResults: 1000
    });
    
    // Build schema context
    const schemaContext: SchemaContext = {
      objectTypes: objectTypes.values.map((ot: any) => ot.name),
      attributes: {},
      referenceTypes: []
    };
    
    // Fetch attributes for each object type (limit to 10 object types to avoid too many requests)
    const objectTypesToProcess = objectTypes.values.slice(0, 10);
    for (const objectType of objectTypesToProcess) {
      try {
        const attributes = await assetsApi.objectTypeAttributesByObjectType({
          objectTypeId: objectType.id
        });
        
        schemaContext.attributes[objectType.name] = attributes.values.map((attr: any) => attr.name);
        
        // Collect reference types
        const referenceAttributes = attributes.values.filter((attr: any) => attr.type === 1);
        for (const refAttr of referenceAttributes) {
          if (refAttr.referenceType?.name) {
            schemaContext.referenceTypes.push(refAttr.referenceType.name);
          }
        }
      } catch (error) {
        console.warn(`Error fetching attributes for object type ${objectType.name}:`, error);
      }
    }
    
    // Cache the schema context
    this.schemaCache.set(schemaId, {
      data: schemaContext,
      timestamp: Date.now()
    });
    
    return schemaContext;
  }
  
  /**
   * Clear the schema cache
   */
  clearSchemaCache(): void {
    this.schemaCache.clear();
  }
  
  /**
   * Get the size of the schema cache
   * @returns The number of entries in the schema cache
   */
  getSchemaCacheSize(): number {
    return this.schemaCache.size;
  }
  
  /**
   * Remove a specific schema from the cache
   * @param schemaId The schema ID to remove from the cache
   * @returns Whether the schema was removed from the cache
   */
  removeSchemaFromCache(schemaId: string): boolean {
    return this.schemaCache.delete(schemaId);
  }
  
  /**
   * Refresh a specific schema in the cache
   * @param schemaId The schema ID to refresh
   */
  async refreshSchema(schemaId: string): Promise<void> {
    try {
      const assetsApi = await this.jiraClient.getAssetsApi();
      const schema = await assetsApi.schemaFind({ id: schemaId });
      
      // Update the schema in the allSchemas array
      const index = this.allSchemas.findIndex(s => s.id === schemaId);
      if (index !== -1) {
        this.allSchemas[index] = schema;
      } else {
        this.allSchemas.push(schema);
      }
      
      // Remove the schema from the validation cache
      this.schemaCache.delete(schemaId);
      
      console.log(`Refreshed schema ${schemaId}`);
    } catch (error) {
      console.error(`Error refreshing schema ${schemaId}:`, error);
      throw error;
    }
  }
  
  /**
   * Refresh all schemas in the cache
   */
  async refreshAllSchemas(): Promise<void> {
    try {
      const assetsApi = await this.jiraClient.getAssetsApi();
      const schemas = await assetsApi.schemaFindAll();
      this.allSchemas = schemas.values || [];
      
      // Clear the validation cache
      this.schemaCache.clear();
      
      console.log(`Refreshed all schemas (${this.allSchemas.length} schemas)`);
    } catch (error) {
      console.error('Error refreshing all schemas:', error);
      throw error;
    }
  }
}

// Export standalone function for backward compatibility
export async function getSchemaForValidation(
  schemaId: string,
  jiraClient: JiraClient
): Promise<SchemaContext> {
  const cacheManager = new SchemaCacheManager(jiraClient);
  return cacheManager.getSchemaForValidation(schemaId, jiraClient);
}
