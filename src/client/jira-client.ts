import { initAssetsApiClient } from 'jira-insights-api';

import { JiraClientConfig } from '../types/index.js';

/**
 * Interface for the Jira Insights API client
 */
interface JiraInsightsClient {
  DefaultService: any;
}

/**
 * Client for interacting with the Jira Insights API
 */
export class JiraClient {
  private client: JiraInsightsClient | null = null;
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
   * Initialize the Jira Insights API client
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
        instance: instance
      }) as JiraInsightsClient;
      
      this.initialized = true;
      console.error('Jira Insights API client initialized successfully');
    } catch (error) {
      console.error('Error initializing Jira Insights API client:', error);
      throw error;
    }
  }

  /**
   * Get the Jira Insights API service
   * @returns The Jira Insights API service
   */
  async getAssetsApi(): Promise<any> {
    if (!this.initialized) {
      await this.initPromise;
    }
    
    if (!this.client) {
      throw new Error('Jira Insights API client not initialized');
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
