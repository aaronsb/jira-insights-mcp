# External Imports - Schema and mapping
Introduction
------------

Applications that perform data imports into Assets must define their own object schema and mapping configuration. Check out the [workflow of external imports guide](https://developer.atlassian.com/cloud/assets/imports-rest-api-guide/workflow/) to see how to obtain the URL for this endpoint from the user.

JSON structure and format
-------------------------

External imports object schema and mapping configurations are defined in a JSON document that conforms to Atlassian's " Imports Schema and Mapping definition" JSON schema.

There are two JSON schema definitions available: current and legacy.

The current JSON schema definition will support the use of External IDs, and also any new functionality. Any payload with an External ID present will automatically default to the 2023-10-19 schema definition. You can see the current JSON schema definition here: [https://api.atlassian.com/jsm/insight/imports/external/schema/versions/2023\_10\_19](https://api.atlassian.com/jsm/insight/imports/external/schema/versions/2023_10_19). See the [External Ids](#external-ids) section below for more information.

The legacy JSON schema definition will NOT support the use of External IDs or any new future functionality. Any payload without an External ID present will automatically default to the 2021-09-15 schema definition. You can see the legacy JSON schema definition here: [https://api.atlassian.com/jsm/insight/imports/external/schema/versions/2021\_09\_15](https://api.atlassian.com/jsm/insight/imports/external/schema/versions/2021_09_15)

If you want to learn more about JSON schema definitions and the tools that are available to you in your tech stack of choice, check out the [JSON schema project](https://json-schema.org/).

### Example schema and mapping document

The following schema and mapping document models two simple object types (Hard Disk and File) and their mapping into Assets objects. The initial assumption is that these two object types have two attributes each, one of them is their Assets label.

Please remember that payloads are case-sensitive. For example, using "Data" instead of "data" in the example below may produce an error.

```
1
2
```


```
{
  "$schema": "https://api.atlassian.com/jsm/assets/imports/external/schema/versions/2021_09_15",
  "schema": {
    "objectSchema": {
      "name": "Disk Analysis Tool",
      "description": "Data imported from The Disk Analysis Tool",
      "objectTypes": [
        {
          "externalId": "object-type/hard-drive",
          "name": "Hard Drive",
          "description": "A hard drive found during scanning",
          "attributes": [
            {
              "externalId": "object-type-attribute/duid",
              "name": "DUID",
              "description": "Device Unique Identifier",
              "type": "text",
              "label": true
            },
            {
              "externalId": "object-type-attribute/disk-label",
              "name": "Disk Label",
              "description": "Hard drive label",
              "type": "text"
            }
          ],
          "children": [
            {
              "externalId": "object-type/file",
              "name": "File",
              "description": "A file present in a hard drive",
              "attributes": [
                {
                  "externalId": "object-type-attribute/path",
                  "name": "Path",
                  "description": "Path of the file",
                  "type": "text",
                  "label": true
                },
                {
                  "externalId": "object-type-attribute/size",
                  "name": "Size",
                  "description": "Size of the file",
                  "type": "integer"
                }
              ]
            }
          ]
        }
      ]
    }
  },
  "mapping": {
    "objectTypeMappings": [
      {
        "objectTypeExternalId": "object-type/hard-drive",
        "objectTypeName": "Hard Drive",
        "selector": "hardDrives",
        "description": "Mapping for Hard Drives",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/duid",
            "attributeName": "DUID",
            "attributeLocators": [
              "id"
            ],
            "externalIdPart": true
          },
          {
            "attributeExternalId": "object-type-attribute/disk-label",
            "attributeName": "Disk Label",
            "attributeLocators": [
              "label"
            ]
          }
        ]
      },
      {
        "objectTypeExternalId": "object-type/file",
        "objectTypeName": "File",
        "selector": "hardDrives.files",
        "description": "Maps files found in hard drives",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/path",
            "attributeName": "Path",
            "attributeLocators": [
              "path"
            ],
            "externalIdPart": true
          },
          {
            "attributeExternalId": "object-type-attribute/size",
            "attributeName": "Size",
            "attributeLocators": [
              "size"
            ]
          }
        ]
      }
    ]
  }
}

```


As we defined our selector for the Hard Drive object as `hardDrives`, and the selector for File as `hardDrives.files`, our data structure should resemble something like this:

```
1
2
```


```
{
  "hardDrives": [
    {
      "id": "Hard drive ID",
      "label": "Hard drive label",
      "files": [
        {
          "path": "/file/path",
          "size": 123456
        }
      ]
    }
  ]
}

```


And so our data chunk payload when calling the `submitResults` endpoint would be:

```
1
2
```


```
{
  "data": {
    "hardDrives": [
      {
        "id": "Hard drive ID",
        "label": "Hard drive label",
        "files": [
          {
            "path": "/file/path",
            "size": 123456
          }
        ]
      }
    ]
  }
}

```


### Reference type attributes

If we want an attribute to refer to another object we can set up a reference type attribute. We will need to tell Assets of which object type the referred object is and provide an object mapping AQL. The following schema and mapping document models two simple object types (Hard Disk and Operating System) and their mapping into Assets objects.

```
1
2
```


```
{
  "$schema": "https://api.stg.atlassian.com/jsm/assets/imports/external/schema/versions/2021_09_15",
  "schema": {
    "objectSchema": {
      "name": "Disk Analysis Tool",
      "description": "Data imported from The Disk Analysis Tool",
      "objectTypes": [
        {
          "externalId": "object-type/hard-drive",
          "name": "Hard Drive",
          "description": "A hard drive found during scanning",
          "attributes": [
            {
              "externalId": "object-type-attribute/duid",
              "name": "DUID",
              "description": "Device Unique Identifier",
              "type": "text",
              "label": true
            },
            {
              "externalId": "object-type-attribute/disk-label",
              "name": "Disk Label",
              "description": "Hard drive label",
              "type": "text"
            },
            {
              "externalId": "object-type-attribute/operating-system",
              "name": "Operating System",
              "description": "OS currently on this hard drive",
              "type": "referenced_object",
              "referenceObjectTypeExternalId": "object-type/operating-system"
            }
          ]
        },
        {
          "externalId": "object-type/operating-system",
          "name": "Operating System",
          "description": "The operating system",
          "attributes": [
            {
              "externalId": "object-type-attribute/operating-system-name",
              "name": "Name",
              "description": "The name of the operating system",
              "type": "text",
              "label": true
            },
            {
              "externalId": "object-type-attribute/operating-system-version",
              "name": "Version",
              "description": "Operating system version",
              "type": "text"
            }
          ]
        }
      ]
    }
  },
  "mapping": {
    "objectTypeMappings": [
      {
        "objectTypeExternalId": "object-type/hard-drive",
        "objectTypeName": "Hard Drive",
        "selector": "hardDrives",
        "description": "Mapping for Hard Drives",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/duid",
            "attributeName": "DUID",
            "attributeLocators": [
              "id"
            ],
            "externalIdPart": true
          },
          {
            "attributeExternalId": "object-type-attribute/disk-label",
            "attributeName": "Disk Label",
            "attributeLocators": [
              "label"
            ]
          },
          {
            "attributeExternalId": "object-type-attribute/operating-system",
            "attributeName": "Operating System",
            "attributeLocators": [
              "os"
            ],
            "objectMappingIQL": "Name Like ${os}"
          }
        ]
      },
      {
        "objectTypeExternalId": "object-type/operating-system",
        "objectTypeName": "Operating System",
        "selector": "os",
        "description": "Mapping for OS",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/operating-system-name",
            "attributeName": "Name",
            "attributeLocators": [
              "name"
            ],
            "externalIdPart": true
          },
          {
            "attributeExternalId": "object-type-attribute/operating-system-version",
            "attributeName": "Version",
            "attributeLocators": [
              "version"
            ]
          }
        ]
      }
    ]
  }
}

```


As we defined our selector for the Hard Drive object as `hardDrives`, and the selector for Operating system as `os`, our data structure should resemble something like this:

```
1
2
```


```
{
  "hardDrives": [
    {
      "id": "Hard drive ID",
      "label": "Hard drive label",
      "os": "macOS Big Sur"
    }
  ],
  "os": [
    {
      "name": "macOS Big Sur",
      "version": "11.6.1"
    }
  ]
}

```


The `objectMappingIQL` will tell Assets that the object to be linked in the object reference attribute type matches the following AQL: `Name Like ${os}`

From the data provided in the above JSON the AQL will be interpolated to: `Name Like "macOS Big Sur"`

And so our data chunk payload when calling the `submitResults` endpoint would be:

```
1
2
```


```
{
  "data": {
    "hardDrives": [
      {
        "id": "Hard drive ID",
        "label": "Hard drive label",
        "os": "macOS Big Sur"
      }
    ],
    "os": [
      {
        "name": "macOS Big Sur",
        "version": "11.6.1"
      }
    ]
  }
}

```


### External Ids

External Ids are used to uniquely identify Objects, Object Schemas, Object Types or Object Type Attributes in Assets. The latter 3 can be set in the mapping/schema payload. Object Types and Object Type Attributes External Ids must be unique across all Object Schemas. From the schema payload below you can see each object type and object type attribute has an external id set with the corresponding external id referred to in the mapping payload.

We require either every Object Type and Object Type attribute to have an External Id set or none at all. Once set the objects can be referred to by their external id for future modifications to the schema/mapping.

If there isn't an external id provided in the schema and mapping, there will be one automatically generated for you. To find out what the external id is for an object type or object type attribute, you can call the `GET /{importSourceId}/schema-and-mapping` endpoint.

```
1
2
```


```
{
  "schema": {
    "objectSchema": {
      "name": "Disk Analysis Tool",
      "description": "Data imported from The Disk Analysis Tool",
      "objectTypes": [
        {
          "externalId": "object-type/hard-drive",
          "name": "Hard Drive",
          "description": "A hard drive found during scanning",
          "attributes": [
            {
              "externalId": "object-type-attribute/duid",
              "name": "DUID",
              "description": "Device Unique Identifier",
              "type": "text",
              "label": true
            },
            {
              "externalId": "object-type-attribute/backups",
              "name": "Backups",
              "description": "Backups of the hard drive",
              "type": "referenced_object",
              "referenceObjectTypeExternalId": "object-type/hard-drive"
            }
          ]
        }
      ]
    }
  },
  "mapping": {
    "objectTypeMappings": [
      {
        "objectTypeExternalId": "object-type/hard-drive",
        "objectTypeName": "Hard Drive",
        "selector": "hardDrives",
        "description": "Mapping for Hard Drives",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/duid",
            "attributeName": "DUID",
            "attributeLocators": [
              "id"
            ],
            "externalIdPart": true
          },
          {
            "attributeExternalId": "object-type-attribute/backups",
            "attributeName": "Backups",
            "attributeLocators": [
              "reference"
            ],
            "objectMappingIQL": "Name Like ${reference}"
          }
        ]
      }
    ]
  }
}

```


### Cardinality and Uniqueness

During the Schema creation you can set the cardinality and uniqueness of an attribute.

For unlimited cardinality set `maximumCardinality` to `-1`

External Ids must be used for all Objects Types and Object Type Attributes for uniqueness and cardinality to be set.

```
1
2
```


```
{
  "externalId": "object-type-attribute/backups",
  "name": "Backups",
  "description": "Backups of the hard drive",
  "type": "referenced_object",
  "referenceObjectTypeExternalId": "object-type/hard-drive",
  "maximumCardinality": 3,
  "minimumCardinality": 1,
  "unique": true
}

```


### Icons

Object types defined in your schema will be given a default icon, unless you specify a custom one for them. Define your custom icons in the `schema.iconSchema` object, and use them in your object type definitions:

```
1
2
```


```
{
  "schema": {
    "iconSchema": {
      "icons": [
        {
          "key": "a-unique-icon-key",
          "name": "User visible icon name",
          "png48": "48x48 pixels base64 encoded PNG icon"
        }
      ]
    },
    "objectSchema": {
      "objectTypes": [
        {
          "name": "Hard Drive",
          "description": "A hard drive found during scanning",
          "iconKey": "a-unique-icon-key"
        }
      ]
    }
  }
}

```


Modifying an existing schema
----------------------------

The mapping endpoint supports `PATCH` calls. The payload accepted by the `PATCH` operation conforms to the same `JSON` shape as the `PUT` operation, but you only need to include the object types and object mappings you wish to modify.

**The specific object types and object type attributes to be modified are identified by their external ids.**

### Supported operations

*   Existing object type and attribute descriptions can be modified.
*   Existing object type icons can be modified
*   New object types can be added to the schema
*   New attributes can be added to existing object types as well.
*   New icons can be added to the schema
*   Existing icons names and image data can be overwritten
*   Mapping definitions for object types can be overwritten

Note that the following properties on existing entities can't be modified:

*   Object type name
*   Attribute name
*   Attribute type
*   Referenced object type (for object reference attributes)
*   Icon keys

Object types, icons and attributes can't be deleted.

### Unsupported operations

*   Mapping of children object types in multiple import configurations.
*   Configure inheritance.

### Example

Following on our example schema above, let's see how we would modify it by:

*   Adding a new attribute to the "Hard Drive" object type, called "Manufacturer"
*   Adding a new object type, "Folder", as a child of the existing object type "Hard Drive"
*   Changing the description of the existing attribute "Path" in the "File" object type

```
1
2
```


```
{
  "$schema": "https://api.stg.atlassian.com/jsm/assets/imports/external/schema/versions/2021_09_15",
  "schema": {
    "objectSchema": {
      "name": "Disk Analysis Tool",
      "description": "Data imported from The Disk Analysis Tool",
      "objectTypes": [
        {
          "externalId": "object-type/hard-drive",
          "name": "Hard Drive",
          "description": "A hard drive found during scanning",
          "attributes": [
            {
              "externalId": "object-type-attribute/manufacturer",
              "name": "Manufacturer",
              "description": "Manufacturer name",
              "type": "text"
            }
          ],
          "children": [
            {
              "externalId": "object-type/folder",
              "name": "Folder",
              "description": "A folder present in a hard drive",
              "attributes": [
                {
                  "externalId": "object-type-attribute/folder-name",
                  "name": "Name",
                  "description": "Folder name",
                  "type": "text",
                  "label": true
                }
              ]
            },
            {
              "externalId": "object-type/file",
              "name": "File",
              "description": "A file present in a hard drive",
              "attributes": [
                {
                  "externalId": "object-type-attribute/path",
                  "name": "Path",
                  "description": "Updated description for the path attribute",
                  "type": "text",
                  "label": true
                }
              ]
            }
          ]
        }
      ]
    }
  },
  "mapping": {
    "objectTypeMappings": [
      {
        "objectTypeExternalId": "object-type/hard-drive",
        "objectTypeName": "Hard Drive",
        "selector": "hardDrives",
        "description": "Mapping for Hard Drives",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/duid",
            "attributeName": "DUID",
            "attributeLocators": [
              "id"
            ],
            "externalIdPart": true
          },
          {
            "attributeExternalId": "object-type-attribute/disk-label",
            "attributeName": "Disk Label",
            "attributeLocators": [
              "label"
            ]
          },
          {
            "attributeExternalId": "object-type-attribute/manufacturer",
            "attributeName": "Manufacturer",
            "attributeLocators": [
              "manufacturer"
            ]
          }
        ]
      },
      {
        "objectTypeExternalId": "object-type/folder",
        "objectTypeName": "Folder",
        "selector": "hardDrives.folders",
        "description": "Mapping for Folder",
        "attributesMapping": [
          {
            "attributeExternalId": "object-type-attribute/folder-name",
            "attributeName": "Name",
            "attributeLocators": [
              "name"
            ],
            "externalIdPart": true
          }
        ]
      }
    ]
  }
}

```
