# Jira Insights API Migration TODO

## Completed Tasks

- [x] Migrated from jira-assets-api-client to jira-insights-api (v2.1.2)
- [x] Removed runtime code generation by removing `regenerate: true` option
- [x] Fixed parameter names in API method calls:
  - [x] Changed `schemaFindAllObjectTypes({ schemaId })` to `schemaFindAllObjectTypes({ id: schemaId })`
  - [x] Changed `objectsByAql({ objectAQLParams })` to `objectsByAql({ requestBody })`
  - [x] Added proper parameters to `objectTypeFindAllAttributes()`
- [x] Verified working operations:
  - [x] Schema listing
  - [x] Object type listing
  - [x] Getting a specific object type

## Remaining Tasks

- [ ] Investigate and fix AQL query format issues
- [ ] Test all operations in the MCP server
- [ ] Update documentation to reflect new API method names and parameters
- [ ] Enhance error handling for better error messages
- [ ] Add validation for input parameters
- [ ] Consider performance optimizations:
  - [ ] Caching frequently used data
  - [ ] Implementing pagination for large result sets

## Notes

The migration to the new jira-insights-api package has been successful for core operations. The package is now static and doesn't attempt to download or generate code at runtime, which resolves the fundamental issue with the previous implementation.

The API method names are similar to the previous version, but parameter names have changed in some cases. We've updated the code to use the correct parameter names based on our testing.

Some advanced operations like AQL queries may need additional investigation and refinement. The current implementation returns validation errors when attempting to query objects using AQL.
