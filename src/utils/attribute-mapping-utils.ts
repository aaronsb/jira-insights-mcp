import { JiraClient } from '../client/jira-client.js';

import { getObjectTypeAttributes } from './attribute-utils.js';

// Types for attribute mapping
export interface AttributeMapping {
  nameToId: Record<string, string>;
  idToName: Record<string, string>;
  _cached?: boolean;
  _cachedAt?: string;
}

export interface AttributeInfo {
  id: string;
  name: string;
  objectTypeId: string;
  objectTypeName: string;
  schemaId: string;
  schemaName: string;
}

// Cache structure
interface CacheEntry {
  nameToId: Record<string, string>;
  idToName: Record<string, string>;
  timestamp: number;
}

// Cache for attribute mappings to improve performance
const attributeMappingCache = new Map<string, CacheEntry>();

// Cache for schema-wide attribute mappings
const schemaAttributeMappingCache = new Map<string, CacheEntry>();

// Cache for global attribute mappings
let globalAttributeMappingCache: CacheEntry | null = null;

// Cache for attribute info
const attributeInfoCache = new Map<string, AttributeInfo[]>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Get attribute mappings for an object type with caching
 * @param jiraClient The Jira client
 * @param objectTypeId The object type ID
 * @param forceRefresh Force a refresh of the cache
 * @returns The attribute mappings for the object type
 */
export async function getAttributeMappings(
  jiraClient: JiraClient,
  objectTypeId: string,
  forceRefresh = false
): Promise<{
  nameToId: Record<string, string>;
  idToName: Record<string, string>;
  _cached?: boolean;
  _cachedAt?: string;
}> {
  // Check cache first if not forcing refresh
  if (!forceRefresh && attributeMappingCache.has(objectTypeId)) {
    const cached = attributeMappingCache.get(objectTypeId)!;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_EXPIRATION) {
      return {
        nameToId: cached.nameToId,
        idToName: cached.idToName,
        _cached: true,
        _cachedAt: new Date(cached.timestamp).toISOString()
      };
    }
  }
  
  try {
    // Get attributes for the object type
    const attributesResult = await getObjectTypeAttributes(jiraClient, objectTypeId);
    
    const nameToId: Record<string, string> = {};
    const idToName: Record<string, string> = {};
    
    // Process attributes from the result
    if (Array.isArray(attributesResult.attributes)) {
      for (const attr of attributesResult.attributes) {
        if (attr.id && attr.name) {
          nameToId[attr.name] = attr.id;
          idToName[attr.id] = attr.name;
          // Also add with 'attr_' prefix for compatibility
          idToName[`attr_${attr.id}`] = attr.name;
        }
      }
    }
    
    // Try to get additional attributes from the API if possible
    try {
      const assetsApi = await jiraClient.getAssetsApi();
      
      // Try to get attributes using objectTypeAttributesByObjectType
      console.log(`Attempting to fetch additional attributes for object type ${objectTypeId} using API`);
      const response = await assetsApi.objectTypeAttributesByObjectType({ 
        objectTypeId: objectTypeId
      });
      
      if (response && response.values && Array.isArray(response.values)) {
        console.log(`Found ${response.values.length} attributes via API for object type ${objectTypeId}`);
        
        for (const attr of response.values) {
          if (attr.id && attr.name) {
            // Store both with and without the 'attr_' prefix
            nameToId[attr.name] = attr.id;
            idToName[attr.id] = attr.name;
            idToName[`attr_${attr.id}`] = attr.name;
          }
        }
      }
    } catch (apiError) {
      console.error('Error fetching additional attributes from API:', apiError);
      // Continue with existing attributes
    }
    
    // Add common system attributes if they don't exist
    const commonAttributes = [
      { id: '173', name: 'Key' },
      { id: '174', name: 'Name' },
      { id: '175', name: 'Created' },
      { id: '176', name: 'Updated' }
    ];
    
    for (const attr of commonAttributes) {
      if (!nameToId[attr.name]) {
        nameToId[attr.name] = attr.id;
        idToName[attr.id] = attr.name;
        idToName[`attr_${attr.id}`] = attr.name;
      }
    }
    
    // Update cache
    attributeMappingCache.set(objectTypeId, {
      nameToId,
      idToName,
      timestamp: Date.now()
    });
    
    return {
      nameToId,
      idToName,
      _cached: false
    };
  } catch (error) {
    console.error(`Error fetching attribute mappings for object type ${objectTypeId}:`, error);
    throw error;
  }
}

/**
 * Clear the attribute mapping cache
 * @param objectTypeId Optional object type ID to clear specific cache entry
 */
export function clearAttributeMappingCache(objectTypeId?: string): void {
  if (objectTypeId) {
    attributeMappingCache.delete(objectTypeId);
  } else {
    attributeMappingCache.clear();
  }
}

/**
 * Convert attribute names to IDs for an object
 * @param attributes The attributes as name-value pairs
 * @param nameToId The mapping from attribute names to IDs
 * @returns The attributes as ID-value pairs
 */
export function convertAttributeNamesToIds(
  attributes: Record<string, any>,
  nameToId: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [name, value] of Object.entries(attributes)) {
    const id = nameToId[name];
    if (id) {
      result[id] = value;
    } else {
      // If the name is not found in the mapping, assume it's already an ID
      result[name] = value;
    }
  }
  
  return result;
}

/**
 * Convert attribute IDs to names for an object
 * @param attributes The attributes as ID-value pairs
 * @param idToName The mapping from attribute IDs to names
 * @returns The attributes as name-value pairs
 */
export function convertAttributeIdsToNames(
  attributes: Record<string, any>,
  idToName: Record<string, string>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [id, value] of Object.entries(attributes)) {
    const name = idToName[id];
    if (name) {
      result[name] = value;
    } else {
      // If the ID is not found in the mapping, keep the original ID
      result[id] = value;
    }
  }
  
  return result;
}

/**
 * Get attribute mappings for all object types in a schema
 * @param jiraClient The Jira client
 * @param schemaId The schema ID
 * @param forceRefresh Force a refresh of the cache
 * @returns The attribute mappings for the schema
 */
export async function getSchemaAttributeMappings(
  jiraClient: JiraClient,
  schemaId: string,
  forceRefresh = false
): Promise<AttributeMapping> {
  // Check cache first if not forcing refresh
  if (!forceRefresh && schemaAttributeMappingCache.has(schemaId)) {
    const cached = schemaAttributeMappingCache.get(schemaId)!;
    
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_EXPIRATION) {
      return {
        nameToId: cached.nameToId,
        idToName: cached.idToName,
        _cached: true,
        _cachedAt: new Date(cached.timestamp).toISOString()
      };
    }
  }
  
  try {
    const assetsApi = await jiraClient.getAssetsApi();
    
    // Get all object types in the schema
    const objectTypes = await assetsApi.objectTypesBySchema({
      id: schemaId,
      startAt: 0,
      maxResults: 100
    });
    
    const nameToId: Record<string, string> = {};
    const idToName: Record<string, string> = {};
    
    // Get attribute mappings for each object type
    if (objectTypes.values && Array.isArray(objectTypes.values)) {
      for (const objectType of objectTypes.values) {
        if (objectType.id) {
          try {
            const mapping = await getAttributeMappings(jiraClient, objectType.id);
            
            // Merge mappings
            Object.assign(nameToId, mapping.nameToId);
            Object.assign(idToName, mapping.idToName);
          } catch (error) {
            console.warn(`Error getting attribute mappings for object type ${objectType.id}:`, error);
            // Continue with other object types
          }
        }
      }
    }
    
    // Update cache
    schemaAttributeMappingCache.set(schemaId, {
      nameToId,
      idToName,
      timestamp: Date.now()
    });
    
    return {
      nameToId,
      idToName,
      _cached: false
    };
  } catch (error) {
    console.error(`Error fetching schema attribute mappings for schema ${schemaId}:`, error);
    throw error;
  }
}

/**
 * Get attribute mappings across all schemas
 * @param jiraClient The Jira client
 * @param forceRefresh Force a refresh of the cache
 * @returns The global attribute mappings
 */
export async function getGlobalAttributeMappings(
  jiraClient: JiraClient,
  forceRefresh = false
): Promise<AttributeMapping> {
  // Check cache first if not forcing refresh
  if (!forceRefresh && globalAttributeMappingCache) {
    // Check if cache is still valid
    if (Date.now() - globalAttributeMappingCache.timestamp < CACHE_EXPIRATION) {
      return {
        nameToId: globalAttributeMappingCache.nameToId,
        idToName: globalAttributeMappingCache.idToName,
        _cached: true,
        _cachedAt: new Date(globalAttributeMappingCache.timestamp).toISOString()
      };
    }
  }
  
  try {
    const assetsApi = await jiraClient.getAssetsApi();
    
    // Get all schemas
    const schemas = await assetsApi.schemaFindAll({
      startAt: 0,
      maxResults: 100
    });
    
    const nameToId: Record<string, string> = {};
    const idToName: Record<string, string> = {};
    
    // Get attribute mappings for each schema
    if (schemas.values && Array.isArray(schemas.values)) {
      for (const schema of schemas.values) {
        if (schema.id) {
          try {
            const mapping = await getSchemaAttributeMappings(jiraClient, schema.id);
            
            // Merge mappings
            Object.assign(nameToId, mapping.nameToId);
            Object.assign(idToName, mapping.idToName);
          } catch (error) {
            console.warn(`Error getting schema attribute mappings for schema ${schema.id}:`, error);
            // Continue with other schemas
          }
        }
      }
    }
    
    // Update cache
    globalAttributeMappingCache = {
      nameToId,
      idToName,
      timestamp: Date.now()
    };
    
    return {
      nameToId,
      idToName,
      _cached: false
    };
  } catch (error) {
    console.error('Error fetching global attribute mappings:', error);
    throw error;
  }
}

/**
 * Get detailed information about attributes across all schemas
 * @param jiraClient The Jira client
 * @param forceRefresh Force a refresh of the cache
 * @returns Array of attribute information
 */
export async function getAllAttributeInfo(
  jiraClient: JiraClient,
  forceRefresh = false
): Promise<AttributeInfo[]> {
  const cacheKey = 'all';
  
  // Check cache first if not forcing refresh
  if (!forceRefresh && attributeInfoCache.has(cacheKey)) {
    const cached = attributeInfoCache.get(cacheKey)!;
    if (cached.length > 0) {
      return [...cached]; // Return a copy to prevent modification
    }
  }
  
  try {
    const assetsApi = await jiraClient.getAssetsApi();
    const attributeInfoList: AttributeInfo[] = [];
    
    // Get all schemas
    const schemas = await assetsApi.schemaFindAll({
      startAt: 0,
      maxResults: 100
    });
    
    // Process each schema
    if (schemas.values && Array.isArray(schemas.values)) {
      for (const schema of schemas.values) {
        if (!schema.id || !schema.name) continue;
        
        // Get all object types in the schema
        const objectTypes = await assetsApi.objectTypesBySchema({
          id: schema.id,
          startAt: 0,
          maxResults: 100
        });
        
        // Process each object type
        if (objectTypes.values && Array.isArray(objectTypes.values)) {
          for (const objectType of objectTypes.values) {
            if (!objectType.id || !objectType.name) continue;
            
            // Get attributes for the object type
            try {
              const attributesResult = await getObjectTypeAttributes(jiraClient, objectType.id);
              
              // Process attributes
              if (Array.isArray(attributesResult.attributes)) {
                for (const attr of attributesResult.attributes) {
                  if (attr.id && attr.name) {
                    attributeInfoList.push({
                      id: attr.id,
                      name: attr.name,
                      objectTypeId: objectType.id,
                      objectTypeName: objectType.name,
                      schemaId: schema.id,
                      schemaName: schema.name
                    });
                  }
                }
              }
            } catch (error) {
              console.warn(`Error getting attributes for object type ${objectType.id}:`, error);
              // Continue with other object types
            }
          }
        }
      }
    }
    
    // Update cache
    attributeInfoCache.set(cacheKey, attributeInfoList);
    
    return attributeInfoList;
  } catch (error) {
    console.error('Error fetching all attribute info:', error);
    throw error;
  }
}

/**
 * Search for attributes by name pattern
 * @param jiraClient The Jira client
 * @param pattern The pattern to search for (string or RegExp)
 * @param options Optional search options
 * @returns Array of matching attribute information
 */
export async function searchAttributesByName(
  jiraClient: JiraClient,
  pattern: string | RegExp,
  options: {
    schemaId?: string;
    objectTypeId?: string;
    caseSensitive?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<AttributeInfo[]> {
  // Get all attribute info
  const allAttributes = await getAllAttributeInfo(jiraClient, options.forceRefresh);
  
  // Create a RegExp from the pattern if it's a string
  const regex = typeof pattern === 'string'
    ? new RegExp(pattern, options.caseSensitive ? '' : 'i')
    : pattern;
  
  // Filter attributes by pattern and options
  return allAttributes.filter(attr => {
    // Filter by schema if specified
    if (options.schemaId && attr.schemaId !== options.schemaId) {
      return false;
    }
    
    // Filter by object type if specified
    if (options.objectTypeId && attr.objectTypeId !== options.objectTypeId) {
      return false;
    }
    
    // Match by name
    return regex.test(attr.name);
  });
}

/**
 * Find common attributes across multiple object types
 * @param jiraClient The Jira client
 * @param objectTypeIds Array of object type IDs
 * @param options Optional options
 * @returns Array of common attribute information
 */
export async function findCommonAttributes(
  jiraClient: JiraClient,
  objectTypeIds: string[],
  options: {
    matchByName?: boolean;
    forceRefresh?: boolean;
  } = {}
): Promise<AttributeInfo[]> {
  if (objectTypeIds.length === 0) {
    return [];
  }
  
  try {
    // Get attribute mappings for each object type
    const attributesByObjectType: Record<string, AttributeInfo[]> = {};
    
    for (const objectTypeId of objectTypeIds) {
      // Get attributes for this object type
      const attributesResult = await getObjectTypeAttributes(jiraClient, objectTypeId, options.forceRefresh);
      
      if (Array.isArray(attributesResult.attributes)) {
        // Get object type details for context
        const assetsApi = await jiraClient.getAssetsApi();
        const objectType = await assetsApi.objectTypeFind({ id: objectTypeId });
        
        // Store attribute info
        attributesByObjectType[objectTypeId] = attributesResult.attributes
          .filter(attr => attr.id && attr.name)
          .map(attr => ({
            id: attr.id,
            name: attr.name,
            objectTypeId: objectTypeId,
            objectTypeName: objectType.name || 'Unknown',
            schemaId: objectType.objectSchemaId || 'Unknown',
            schemaName: 'Unknown' // We could fetch this, but it's not critical
          }));
      }
    }
    
    // Find common attributes
    const firstObjectTypeId = objectTypeIds[0];
    const firstObjectTypeAttrs = attributesByObjectType[firstObjectTypeId] || [];
    
    if (options.matchByName) {
      // Match by attribute name
      return firstObjectTypeAttrs.filter(attr => {
        // Check if this attribute name exists in all other object types
        return objectTypeIds.slice(1).every(otherTypeId => {
          const otherTypeAttrs = attributesByObjectType[otherTypeId] || [];
          return otherTypeAttrs.some(otherAttr => otherAttr.name === attr.name);
        });
      });
    } else {
      // Match by attribute ID
      return firstObjectTypeAttrs.filter(attr => {
        // Check if this attribute ID exists in all other object types
        return objectTypeIds.slice(1).every(otherTypeId => {
          const otherTypeAttrs = attributesByObjectType[otherTypeId] || [];
          return otherTypeAttrs.some(otherAttr => otherAttr.id === attr.id);
        });
      });
    }
  } catch (error) {
    console.error('Error finding common attributes:', error);
    throw error;
  }
}

/**
 * Clear all attribute mapping caches
 */
export function clearAllAttributeMappingCaches(): void {
  attributeMappingCache.clear();
  schemaAttributeMappingCache.clear();
  globalAttributeMappingCache = null;
  attributeInfoCache.clear();
}
