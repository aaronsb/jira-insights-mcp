# Using Assets Query Language (AQL) syntax | Jira Service Management Cloud | Atlassian Support
Assets Query Language (AQL) is a language format used in Assets to create search queries for one or more objects. Using AQL, you can return any object or group of objects in a search, filter objects, modify objects, create custom fields, automate processes, and more.

AQL can be used in the **Advanced AQL** search or within an object custom field. It is one of Assets' most powerful and dynamic features.

* * *

### Basic syntax

The basic syntax of an AQL query is `<attribute> <operator> <value/function>`. When the attributes of the objects match the operator and value specified, one or more objects will be returned by the query.

**Example:** `Owner = "Ted Anderson"`

This AQL query would return all objects where the Owner is Ted Anderson. Note the quotations around "Ted Anderson" because there is a space in the value.

### Syntax for special characters

AQL has a defined syntax and must be entered exactly.

*   AQL is _not_ case-sensitive.
    
*   If you are using an expression where the value or attribute contain a space, you must include quotations surrounding the value, as in the above example for "Ted Anderson".
    
*   If you are using an expression where the value or attribute contain quotation marks, you must escape the quotes by preceding them with backslashes. For example, if you have an object name such as _**15" Screen**_, to search for it enter: `15\” Screen`
    
*   The attribute name that you specify in the AQL must exist in your Assets schema. If not, the AQL will be considered invalid.
    

AQL has a defined syntax that must be entered exactly. Here are some key guidelines:

*   **AQL is not case-sensitive.**
    
*   If the value or attribute contains spaces, enclose it in quotations. For example: `"Ted Anderson"`.
    
*   If the value or attribute contains quotation marks, escape them using backslashes. For example, for an object name like **15" Screen**, use: `15\” Screen`.
    
*   The attribute name you specify in the AQL must exist in your Assets schema. If not, the AQL will be invalid.
    

AQL can be helpful in accomplishing the following tasks:

*   [Automate your objects in Assets](https://support.atlassian.com/jira-service-management-cloud/docs/automate-your-objects-in-insight/ "https://support.atlassian.com/jira-service-management-cloud/docs/automate-your-objects-in-insight/")
    
*   [Search for objects with Assets Query Language](https://support.atlassian.com/jira-service-management-cloud/docs/search-for-objects-with-insight-query-language/ "https://support.atlassian.com/jira-service-management-cloud/docs/search-for-objects-with-insight-query-language/")
    
*   [Set up the Assets object field](https://support.atlassian.com/jira-service-management-cloud/docs/set-up-the-insight-object-field/ "https://support.atlassian.com/jira-service-management-cloud/docs/set-up-the-insight-object-field/")
    

* * *

### Dot notation

Dot notation in AQL is used to traverse a reference chain of objects. The format `<attribute>.<attribute> <operator> <value/function>` allows you to return information based on objects referenced by a parent object.

**For example:** “Belongs to Department”.Name = HR

Here, the `Employee` object type has a referenced attribute called `"Belongs to Department"`. This query will return all employees who belong to the HR department.

Since the referenced attribute contains spaces, it is enclosed in double quotes for proper formatting.

* * *

### Keywords

In AQL, you can use keywords to return objects based on their properties rather than specific attributes. The syntax is as follows: `<keyword> <operator> <value/function>`

For instance, to return all objects of a specific object type, you can use the `objectType` keyword.

**Example:** `objectType = “Employee”`

The table below lists supported keywords and examples:



* Keyword: objectSchema
  * Description: You can limit the search result to a specific object schema name, e.g. objectSchema = "ITSM Schema".
* Keyword: objectSchemaId
  * Description: You can limit the search result on object schema ids. e.g. objectSchemaId in (1, 2).
* Keyword: objectType
  * Description: You can limit the search result to a specific object type name, e.g. objectType = "Employment Start Date".
* Keyword: objectTypeId
  * Description: You can limit the search result on object type ids. e.g. objectTypeId in (1, 2).
* Keyword: object
  * Description: You can limit the search to the object, e.g. "object having inboundReferences()" will search all objects having any inbound references to it.
* Keyword: objectId
  * Description: You can find an object by object Id, e.g. "objectId = 114". Note that the object id is the number from the Key of the object, but without the prefix. E.g. if the Key of your object is ITSM-1111, then the prefix is ITSM and the object id is 1111.


An AQL query that returns all objects with the "Host" object type:

If you're in the **User** role, you won’t have access to the object type ID or schema ID. You can request these values from your **Administrator** or **Manager** to perform your queries.

Alternatively, instead of using the objectId, you can search using the **Key** attribute for any object type to find a specific object.

**For example:** `Key = "ITSM-1111"`

This query will return the unique object whose key is **ITSM-1111**.

* * *

### Operators

Operators in AQL help you create more detailed and logical expressions for querying objects. Here’s a table that describes the operators supported:



* Operator: =
  * Description: Equality test for case insensitive values.
  * Example AQL query: Office = StockholmChecks if the Office attribute has a value equal to Stockholm or STOCKHOLM.
* Operator: ==
  * Description: Equality test for case sensitive values.
  * Example AQL query: Office==StockholmChecks if the Office attribute has a value equal to Stockholm considering the case of the input provided.
* Operator: !=
  * Description: Inequality test
  * Example AQL query: objecttype=Employee and Office!=StockholmChecks if the Employee object has an attribute Office whose value is NOT equal to Stockholm.
* Operator: <
  * Description: Less than test.
  * Example AQL query: Price < 2000Checks if the Price is less than 2000 dollars.
* Operator: >
  * Description: Greater than test.
  * Example AQL query: Price > 2000Checks if the Price is greater than 2000 dollars.
* Operator: <=
  * Description: Less than or equal to test
  * Example AQL query: Price <= 2000Checks if the Price is less than or equal to  2000 dollars.
* Operator: >=
  * Description: Greater than or equal to test.
  * Example AQL query: Price >= 2000Checks if the Price is greater than or equal to 2000 dollars.
* Operator: like
  * Description: Matches a value with any subset of input in the query. It is case insensitive.
  * Example AQL query: objecttype=Employees and Office like StockReturns all objects of Employees type which have an Office attribute value that contains the characters 'Stock' or 'STOCK'.
* Operator: not like
  * Description: Excludes values which match with any subset of input in the query.
  * Example AQL query: objecttype=Employees and Office not like Stock.Returns all objects of Employees type which have an Office attribute value that DO NOT contain the characters 'Stock'.
* Operator: in()
  * Description: Finds a match in the given arguments and returns results.
  * Example AQL query: Office in (Stockholm, Oslo, "San Jose").Returns all objects of Office type which HAVE one of these values: Stockholm, Oslo or San Jose.
* Operator: not in()
  * Description: Excludes the results for which a match is found in the given arguments.
  * Example AQL query: Office not in (Stockholm, Oslo, "San Jose").Returns all objects of Office type which DO NOT HAVE one of these values: Stockholm, Oslo or San Jose.
* Operator: startswith
  * Description: Finds a match whose value starts with the given input. It is case insensitive.
  * Example AQL query: Office startsWith St.Returns results which match values of Office type starting with the characters "St" or "ST".
* Operator: endswith
  * Description: Finds a match whose value ends with the given input. It is case insensitive.
  * Example AQL query: Office endsWith St.Returns results which match values of Office type ending with the characters "St" or "ST".
* Operator: is
  * Description: Helps test whether a value exists or not.
  * Example AQL query: Office is EMPTY.Checks whether the value of the Office type exists and returns results accordingly."Office is not EMPTY"Checks whether the value of the Office type is not empty.
* Operator: dot operator(.)
  * Description: Helps navigate the Referenced types attributes for an object.This operator is commonly used in:inboundReferences() or inR() functions.outboundReferences() or outR() functions.Order by clause.
  * Example AQL query: Country.Office = StockholmThe dot operator here navigates to the referenced object Office in the attribute Country and compares Office with the value Stockholm.
* Operator: having
  * Description: Used with either the inboundReferences() OR outboundReferences() functions
  * Example AQL query: object having inboundReferences()Returns all objects having inbound references.
* Operator: not having
  * Description: Used with either the inboundReferences() OR outboundReferences() functions
  * Example AQL query: object not having inboundReferences()Excludes all objects having inbound references and returns results.


* * *

### Combination operators

You can use operators like **AND** and **OR** to combine multiple conditions and create more complex AQL queries. Here’s an example:

`objectType = "Host" AND "Operating System" = "Ubuntu (64-bit"`

* * *

### Functions 

You can use different functions to supply dynamic values to AQL queries.



* Type: Date and time
  * Function name: now()startOfDay()endOfDay()startOfWeek()endOfWeek()startOfMonth()endOfMonth()startOfYear()endOfYear()
  * Description: You can use a range of functions to write queries which involve date and time.We use m for minutes, h for hours, d for days and w for weeks to represent relative time.e.g. A query with a condition like: Created > "now(-2h 15m)" returns all objects created in the last 2 hours and 15 minutes.e.g. A query containing something like: objectType = Employees and "Employment End Date" < endOfMonth(-90d)returns all Employee objects whose Employment End Date falls before 90 days from the current month's end date.e.g. You may also check for an upcoming date, e.g. check when the license of a software expires by the end of the year. Your query can then include something like : licenseEndDate = endOfYear()You can use all other date functions in a similar manner.
* Type: User
  * Function name: currentUser()
  * Description: You can filter on user attributes connected to the current (logged in) user by invoking this function in your AQL query. Note that the attribute used in the query for filtering needs to be of type User.e.g. objecttype = Computer and User = currentUser()This function will work when a currentUser is selected, ie. the user is logged in.
* Type: currentReporter()
  * Function name: You can filter on user attributes connected to current reporter in custom fields by invoking this function in your AQL query. Note that the attribute used in the query for filtering needs to be of type User.e.g. User = currentReporter()This function will only work when an issue is selected, and refers to the reporter that appears in the current issue.
  * Description: 
* Type: user(user1, user2, ..)
  * Function name: You can filter on objects which have a reference to the users that you provide in the argument list of the function. The attribute used to filter must be of User type. This function will work with multiple arguments only if the User type attribute that you filter on allows multiple values i.e, the cardinality for it is more than one.e.g. An object type Team has an attribute Member. This attribute is of User type. Additionally, this attribute has been configured to have a cardinality of 3. If you want to search a set of Team objects where the users: admin and manager are its members, you can write the following query:objecttype=Team and Member having user("admin", "manager")
  * Description: 
* Type: Group
  * Function name: group(group1, group2,...)
  * Description: You can filter on any object connected to a user within a specific group. The attribute used to filter has to be of User type.e.g. User in group("jira-users", "jira-administrators")
* Type: 
  * Function name: user(user1, user2, ...)
  * Description: Filter on any object connected to a user within a specific group. The attribute used to filter has to be of Group type.e.g. Group having user("currentReporter()")
* Type: Project
  * Function name: currentProject()
  * Description: Filter on any object connected to the currently selected Jira project. Works only in the context of a ticket.e.g. Project = currentProject()


* * *

### Reference functions

Reference functions in AQL allow you to run a query on a subset of objects, typically of a specific reference type. They take two arguments: an AQL query and an optional reference-type argument.

*   **AQL argument**: This is the query you want to run, which could include other reference functions.
    
*   **Reference type argument**: This is optional and allows you to limit the query to a particular reference type.
    



* Sr. No: a
  * Name: inboundReferences(AQL)inR(AQL)
  * Description: Filter objects having inbound references where the referenced objects match the AQL query provided as an argument to the function.e.g. An AQL query like: object having inboundReferences() will return all objects having inbound references since the empty AQL argument to the function will match all inbound referenced objects.But an example query like: object having inboundReferences(Name="John") will return all objects which have an inbound referenced object with an attribute Name and value for Name as "John".
* Sr. No: b
  * Name: inboundReferences(AQL, referenceTypes)inR(AQL, refTypes)
  * Description: This is a variant of the inboundReferences(AQL) function described in (a)Using this, you can filter the inbound referenced objects further by providing the Reference Type as a single or multiple value(s). You can do this with the help of the "IN" operator.Reference Type is the Additional Value field that you provide on an attribute when you define a referenced object for an object type.e.g. An AQL query like this: object having inR(objectType = "File System", refType IN ("Depends"))will return objects which have inbound referenced objects of "File System" and only for those File System objects whose Reference Type is "Depends".Similarly, an AQL query like: object having inR(objectType = "File System", refType IN ("Depends", "Installed", "Using"))will return objects which have inbound referenced objects of File System and for those File System objects whose Reference Type is any of these: Depends, Installed, Using
* Sr. No: c
  * Name: outboundReferences(AQL)outR(AQL)
  * Description: Filter objects having outbound references where the referenced objects match the AQL query provided as an argument to the function.e.g. An AQL query like: object having outboundReferences() will return all objects having outbound references since the empty AQL argument to the function will match all outbound referenced objects.But an example query like: object having outboundReferences(Name="John") will return all objects which have an outbound referenced object with an attribute Name and value for Name as "John".
* Sr. No: d
  * Name: outboundReferences(AQL, referenceTypes)outR(AQL, refTypes)
  * Description: This is a variant of the outboundReferences(AQL) function described in (b)Using this, you can filter the outbound referenced objects further by providing the Reference Type as a single or multiple value(s). You can do this with the help of the "IN" operator.Reference Type is the Additional Value field that you provide on an attribute when you define a referenced object for an object type.e.g. An AQL query like this: object having outR(objectType = "Employees", refType IN ("Location"))will return objects which have outbound referenced objects of Employees and only for those Employees objects whose Reference Type is "Location".Similarly, an AQL query like: object having outR(objectType = "Employees", refType IN ("Location", "Country"))will return objects which have outbound referenced objects of Employees and for those Employees objects whose Reference Type is any of these: Location, Country


### Using the connectedTickets() function

The `connectedTickets()` function in AQL is used to filter objects that have Jira work items connected to them. You can specify a JQL query to filter the specific Jira work you want to include in your search. If no JQL query is provided, the function will return all objects that have connected Jira issues.

You **must** provide a JQL as an argument to that AQL function (e.g. `object having connectedTickets(Project = VK)`).



* Name: connectedTickets(JQL query)
  * Description: Object having tickets connected to them that match given JQL query are returned.e.g The query: object HAVING connectedTickets(labels is empty)runs a JQL query (labels is empty) on all connected tickets, and then returns objects based on the results.


### Using the objectTypeAndChildren() function

The `objectTypeAndChildren()` function in AQL is used to return objects of a specific object type along with their associated child objects. This function is useful when you want to retrieve not just a parent object but also its related child objects within the same query.



* Name: objectTypeAndChildren(Name)
  * Description: Filter objects based on the object type specified by the Name and its children. If the name contains spaces, make sure you enclose it within a pair of double quotes.
* Name: objectTypeAndChildren(ID)
  * Description: Filter objects based on the object type specified by the ID and its children.


This AQL query returns all objects and child objects from the "Asset Details" object type:

`objectType in objectTypeAndChildren("Asset Details")`

### Combining references, functions and AQL

Functions, references, and AQL can be combined in powerful ways. For example, you could add multiple object references to a custom field attached to an object, and then search those references for a specific key:

`object HAVING inboundReferences(Key IN (${MyCustomField${0}}))`

Or a specific label, by using dot notation:

`object HAVING inboundReferences(Label IN (${Portfolios.label${0}}))`

These above two queries make use of Assets placeholders. [Learn more about Assets placeholders](https://support.atlassian.com/jira-service-management-cloud/docs/use-placeholders-to-replace-information-depending-on-context/ "https://support.atlassian.com/jira-service-management-cloud/docs/use-placeholders-to-replace-information-depending-on-context/").

This powerful function can produce results that may not be immediately obvious, especially when dealing with complex queries that involve operations like negation. To interpret the results accurately, it’s helpful to think of the query process as a two-step action:

1.  **JQL execution**: The first step filters the relevant Jira work items using JQL.
    
2.  **AQL execution**: The second step applies the AQL logic to the results returned by the JQL query, operating on the filtered set of work items.
    

By breaking it down into these steps, you can better understand and refine the query results, especially when dealing with more intricate or negated conditions.

By default, the Assets object detail view presents **Unresolved** connected tickets.

* * *

### Ordering

You can order the results of your AQL query by appending the following suffix:

`pgsqlCopyEditorder by [AttributeName|label] [asc|desc]`

*   If no order by clause is specified, the default order is ascending by the object type's `label` attribute.
    
*   If the attribute in the order by clause is a reference type, you can use dot notation to order by an attribute of the referenced object.
    
    *   For example, to order by the referenced `Department` of an `Employee` object, use: `order by Employee.Department`. This can be done in unlimited depth, but each additional dot will impact query performance.
        
*   Missing values will appear at the top of the list when using ascending order (`asc`).
    
*   The attribute used in the order by clause must exist in the Assets schema. If it does not, the AQL will be invalid.
    
*   You can use the `label` placeholder to order objects by their configured label.
    
*   Ordering by multiple attributes is not supported.
    

If the attribute specified in the `order by` clause is not found in the results, the order will be arbitrary.