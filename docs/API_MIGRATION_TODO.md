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

## Planned Improvements

### High Priority

- [x] **Enhanced Error Handling**
  - [x] Create centralized error handling utility (`src/utils/error-handler.ts`)
  - [x] Add detailed error messages with specific validation issues
  - [x] Include suggested fixes in error responses
  - [x] Implement error code standardization

- [x] **Fix AQL Query Format Issues**
  - [x] Create AQL validation and formatting utilities (`src/utils/aql-utils.ts`)
  - [x] Validate queries before submission to catch common errors
  - [x] Format queries properly for the API
  - [x] Add query examples for different schemas

- [x] **Attribute Discovery Enhancement**
  - [x] Implement dedicated attribute discovery function (`src/utils/attribute-utils.ts`)
  - [x] Fix the "expand" parameter handling for attributes
  - [x] Add caching for frequently accessed attributes
  - [x] Ensure proper error handling for attribute retrieval

### Medium Priority

- [x] **Improved Documentation**
  - [x] Update AQL syntax documentation with more examples
  - [x] Create operation-specific documentation
  - [x] Add parameter validation documentation
  - [x] Document common error scenarios and solutions

- [x] **Object Template Generation**
  - [x] Create template generation utility based on object types
  - [x] Add type-specific placeholder generation
  - [x] Include validation rules in templates

- [ ] **Performance Optimizations**
  - [ ] Implement caching for frequently used data
  - [ ] Add pagination support for large result sets
  - [ ] Optimize API calls to reduce overhead

## Remaining Tasks

- [ ] Test all operations in the MCP server
- [ ] Update documentation to reflect new API method names and parameters
- [ ] Add validation for input parameters
- [ ] Implement batch operations for better performance

## Implementation Details

### AQL Query Format Issues

The current implementation returns validation errors when attempting to query objects using AQL. The planned solution includes:

1. **Validation**: Create a function to validate AQL queries before submission, checking for:
   - Missing comparison operators
   - Unbalanced quotes
   - Missing quotes around values with spaces
   - Incorrect logical operators (lowercase vs. uppercase)

2. **Formatting**: Implement a function to format AQL queries properly for the API:
   - Ensure AND/OR operators are uppercase
   - Add proper spacing around operators
   - Ensure proper quoting for values with spaces

3. **Examples**: Provide schema-specific example queries to help users construct valid AQL queries.

### Attribute Discovery Enhancement

The `manage_jira_insight_object_type` function with the "attributes" expand parameter doesn't return attribute information. The planned solution includes:

1. **Dedicated Function**: Create a function to retrieve attributes for an object type with proper parameter formatting.

2. **Caching**: Implement caching for attributes to improve performance.

3. **Error Handling**: Add specific error handling for attribute retrieval failures.

4. **Integration**: Update the object type handlers to use the new attribute discovery function.

### Error Handling Improvements

The current error handling is minimal and doesn't provide helpful information to users. The planned solution includes:

1. **Centralized Utility**: Create a utility function to handle errors consistently across all handlers.

2. **Context-Aware Messages**: Provide detailed error messages based on the operation and context.

3. **Suggested Fixes**: Include suggested fixes for common errors.

4. **Examples**: Provide examples of correct usage for each operation.

## Notes

The migration to the new jira-insights-api package has been successful for core operations. The package is now static and doesn't attempt to download or generate code at runtime, which resolves the fundamental issue with the previous implementation.

The API method names are similar to the previous version, but parameter names have changed in some cases. We've updated the code to use the correct parameter names based on our testing.

For more detailed implementation plans, see:
- `TODO.md` - Comprehensive todo list with all tasks organized by priority
- `IMPLEMENTATION_PLAN.md` - Detailed implementation plans for the high-priority improvements
- `HANDLER_IMPROVEMENTS.md` - Specific changes needed for each handler file
- `IMPROVEMENT_SUMMARY.md` - Concise summary of the planned improvements
