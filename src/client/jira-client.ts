import { initAssetsApiClient } from 'jira-assets-api-client';

import { JiraClientConfig } from '../types/index.js';

/**
 * Interface for the Jira Assets API client
 */
interface JiraAssetsClient {
  DefaultService: JiraAssetsService;
}

/**
 * Interface for the Jira Assets API service
 */
interface JiraAssetsService {
  // Schema operations
  schemaList: (params?: { startAt?: number; maxResults?: number }) => Promise<{ values: unknown[] }>;
  getSchema: (params: { id: string }) => Promise<unknown>;
  createSchema: (params: { objectSchemaIn: unknown }) => Promise<unknown>;
  updateSchema: (params: { id: string; objectSchemaIn: unknown }) => Promise<unknown>;
  deleteSchema: (params: { id: string }) => Promise<void>;
  
  // Object type operations
  getObjectTypes: (params: { schemaId: string; startAt?: number; maxResults?: number }) => Promise<{ values: unknown[] }>;
  getObjectType: (params: { id: string }) => Promise<unknown>;
  createObjectType: (params: { objectTypeIn: unknown }) => Promise<unknown>;
  updateObjectType: (params: { id: string; objectTypeIn: unknown }) => Promise<unknown>;
  deleteObjectType: (params: { id: string }) => Promise<void>;
  getObjectTypeAttributes: (params: { objectTypeId: string }) => Promise<{ values: unknown[] }>;
  
  // Object operations
  getObjects: (params: { objectTypeId: string; startAt?: number; maxResults?: number }) => Promise<{ values: unknown[] }>;
  getObject: (params: { id: string }) => Promise<unknown>;
  createObject: (params: { objectIn: unknown }) => Promise<unknown>;
  updateObject: (params: { id: string; objectIn: unknown }) => Promise<unknown>;
  deleteObject: (params: { id: string }) => Promise<void>;
  findObjectsByAql: (params: { objectAQLParams: { aql: string; startAt?: number; maxResults?: number } }) => Promise<unknown>;
}

/**
 * Client for interacting with the Jira Insights API
 */
export class JiraClient {
  private client: JiraAssetsClient | null = null;
  private config: JiraClientConfig;
  private initialized = false;
  private initPromise: Promise<void>;

  /**
   * Create a new JiraClient instance
   * @param config Configuration for the Jira client
   */
  constructor(config: JiraClientConfig) {
    this.config = config;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the Jira Assets API client
   */
  private async initialize(): Promise<void> {
    try {
      // Extract host domain from the full URL
      const hostMatch = this.config.host.match(/https?:\/\/([^/]+)/);
      const instance = hostMatch ? hostMatch[1].split('.')[0] : '';

      // Initialize the client
      this.client = await initAssetsApiClient({
        email: this.config.email,
        apiToken: this.config.apiToken,
        instance: instance,
      }) as JiraAssetsClient;
      
      this.initialized = true;
      console.error('Jira Assets API client initialized successfully');
    } catch (error) {
      console.error('Error initializing Jira Assets API client:', error);
      throw error;
    }
  }

  /**
   * Get the Jira Assets API client
   * @returns The Jira Assets API service
   */
  async getAssetsApi(): Promise<JiraAssetsService> {
    if (!this.initialized) {
      await this.initPromise;
    }
    
    if (!this.client) {
      throw new Error('Jira Assets API client not initialized');
    }
    
    return this.client.DefaultService;
  }

  /**
   * Get the Jira client configuration
   * @returns The Jira client configuration
   */
  getConfig(): JiraClientConfig {
    return this.config;
  }
}
