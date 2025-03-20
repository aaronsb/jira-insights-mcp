import { JiraClient } from '../client/jira-client.js';

// Cache for attributes to improve performance
const attributeCache = new Map<string, { 
  attributes: any[]; 
  timestamp: number;
}>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Get attributes for an object type with caching
 * @param jiraClient The Jira client
 * @param objectTypeId The object type ID
 * @param forceRefresh Force a refresh of the cache
 * @returns The attributes for the object type
 */
export async function getObjectTypeAttributes(
  jiraClient: JiraClient,
  objectTypeId: string,
  forceRefresh = false
): Promise<{
  attributes: any[];
  count: number;
  _cached?: boolean;
  _cachedAt?: string;
}> {
  // Check cache first if not forcing refresh
  if (!forceRefresh && attributeCache.has(objectTypeId)) {
    const cached = attributeCache.get(objectTypeId)!;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_EXPIRATION) {
      return {
        attributes: cached.attributes,
        count: cached.attributes.length,
        _cached: true,
        _cachedAt: new Date(cached.timestamp).toISOString()
      };
    }
  }
  
  try {
    const assetsApi = await jiraClient.getAssetsApi();
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
    
    // Update cache
    attributeCache.set(objectTypeId, {
      attributes,
      timestamp: Date.now()
    });
    
    return {
      attributes,
      count: attributes.length,
      _cached: false
    };
  } catch (error) {
    console.error(`Error fetching attributes for object type ${objectTypeId}:`, error);
    throw error;
  }
}

/**
 * Clear the attribute cache
 * @param objectTypeId Optional object type ID to clear specific cache entry
 */
export function clearAttributeCache(objectTypeId?: string): void {
  if (objectTypeId) {
    attributeCache.delete(objectTypeId);
  } else {
    attributeCache.clear();
  }
}

/**
 * Format attributes for object creation/update
 * @param attributes The attributes as key-value pairs
 * @returns Formatted attributes for the API
 */
export function formatAttributes(attributes: Record<string, any>): any[] {
  return Object.entries(attributes).map(([key, value]) => ({
    objectTypeAttributeId: key,
    objectAttributeValues: Array.isArray(value) 
      ? value.map(v => ({ value: v }))
      : [{ value }],
  }));
}
