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
 * Check if a value is a reference object
 * @param value The value to check
 * @returns True if the value is a reference object, false otherwise
 */
function isReferenceObject(value: any): boolean {
  return typeof value === 'object' && 
         value !== null && 
         !Array.isArray(value) && 
         (value.id !== undefined || value.key !== undefined || value.objectTypeId !== undefined);
}

/**
 * Format a single value for an attribute
 * @param value The value to format
 * @returns The formatted value
 */
function formatAttributeValue(value: any): { value: any } {
  // If it's a reference object, use the key if available, otherwise use the ID
  if (isReferenceObject(value)) {
    // For reference objects, we need to use the object key (not the ID)
    // According to the Jira Insights API documentation
    if (value.key) {
      return { value: value.key };
    } else if (value.id) {
      return { value: value.id };
    } else if (value.objectMappingIQL) {
      // If objectMappingIQL is provided, use it directly
      return { value: value.objectMappingIQL };
    } else {
      console.warn('Reference object missing key and id:', value);
      return { value: JSON.stringify(value) };
    }
  }
  
  // For all other values, use the value as is
  return { value };
}

/**
 * Format attributes for object creation/update
 * @param attributes The attributes as key-value pairs
 * @returns Formatted attributes for the API
 */
export function formatAttributes(attributes: Record<string, any>): any[] {
  console.log('Formatting attributes:', JSON.stringify(attributes, null, 2));
  
  const formattedAttributes = Object.entries(attributes).map(([key, value]) => {
    // Handle array values (multi-value attributes)
    if (Array.isArray(value)) {
      const formatted = {
        objectTypeAttributeId: key,
        objectAttributeValues: value.map(formatAttributeValue)
      };
      console.log(`Formatted array attribute ${key}:`, JSON.stringify(formatted, null, 2));
      return formatted;
    }
    
    // Handle single values
    const formatted = {
      objectTypeAttributeId: key,
      objectAttributeValues: [formatAttributeValue(value)]
    };
    console.log(`Formatted single attribute ${key}:`, JSON.stringify(formatted, null, 2));
    return formatted;
  });
  
  console.log('All formatted attributes:', JSON.stringify(formattedAttributes, null, 2));
  return formattedAttributes;
}
