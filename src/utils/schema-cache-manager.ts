import { JiraClient } from '../client/jira-client.js';

/**
 * Manages caching of Jira Insights schemas
 * Retrieves all schemas on initialization and provides methods to access and refresh them
 */
export class SchemaCacheManager {
  private schemas: Map<string, any> = new Map();
  private initialized = false;
  private initPromise: Promise<void>;
  
  /**
   * Create a new SchemaCacheManager instance
   * @param jiraClient The Jira client instance
   */
  constructor(private jiraClient: JiraClient) {
    this.initPromise = this.initialize();
  }
  
  /**
   * Initialize the schema cache by fetching all schemas
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<void> {
    try {
      await this.refreshAllSchemas();
      this.initialized = true;
      console.error('Schema cache initialized successfully');
    } catch (error) {
      console.error('Error initializing schema cache:', error);
      throw error;
    }
  }
  
  /**
   * Refresh all schemas in the cache
   * @returns Promise that resolves when all schemas are refreshed
   */
  async refreshAllSchemas(): Promise<void> {
    try {
      const assetsApi = await this.jiraClient.getAssetsApi();
      const schemaList = await assetsApi.schemaList({ maxResults: 100 });
      
      // Clear existing cache
      this.schemas.clear();
      
      // Fetch and cache each schema with its details
      const promises = (schemaList.values || []).map(
        (schemaInfo: any) => this.refreshSchema(schemaInfo.id)
      );
      
      await Promise.all(promises);
      
      console.error(`Cached ${this.schemas.size} schemas successfully`);
    } catch (error) {
      console.error('Error refreshing schemas:', error);
      throw error;
    }
  }
  
  /**
   * Refresh a specific schema in the cache
   * @param schemaId The ID of the schema to refresh
   * @returns Promise that resolves when the schema is refreshed
   */
  async refreshSchema(schemaId: string): Promise<void> {
    try {
      const assetsApi = await this.jiraClient.getAssetsApi();
      const schema = await assetsApi.schemaFind({ id: schemaId });
      
      // Fetch object types for this schema
      const objectTypesList = await assetsApi.schemaFindAllObjectTypes({ 
        id: schemaId,
        excludeAbstract: false
      });
      
      // Enhance schema with object types
      const objectTypes = objectTypesList.values || [];
      console.error(`Schema ${schemaId} has ${objectTypes.length} object types`);
      
      const enhancedSchema = {
        ...schema,
        objectTypes: objectTypes,
        _cached: new Date().toISOString()
      };
      
      this.schemas.set(schemaId, enhancedSchema);
      console.error(`Schema ${schemaId} cached successfully with ${objectTypes.length} object types`);
    } catch (error) {
      console.error(`Error refreshing schema ${schemaId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get a specific schema from the cache
   * @param schemaId The ID of the schema to get
   * @returns The schema object, or undefined if not found
   */
  getSchema(schemaId: string): any {
    return this.schemas.get(schemaId);
  }
  
  /**
   * Get all schemas from the cache
   * @returns Array of all schema objects
   */
  getAllSchemas(): any[] {
    return Array.from(this.schemas.values());
  }
  
  /**
   * Check if the cache is initialized
   * @returns True if the cache is initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Wait for the cache to be initialized
   * @returns Promise that resolves when the cache is initialized
   */
  async waitForInitialization(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    return this.initPromise;
  }
}
