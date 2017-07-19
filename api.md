## Modules

<dl>
<dt><a href="#module_adlap">adlap</a></dt>
<dd></dd>
</dl>

## Constants

<dl>
<dt><a href="#adldapClient">adldapClient</a></dt>
<dd><p>A simple <code>Promise</code> based interface to Active Directory backed by the <code>ldapjs</code>
library.</p>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#init">init([$log])</a> ⇒ <code>clientFactory</code></dt>
<dd><p>Initialize the module with a logger and return a client factory function.
If no logger instance is provided, a noop logger will be used.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#SearchOptions">SearchOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#LdapjsOptions">LdapjsOptions</a> : <code>object</code></dt>
<dd></dd>
<dt><a href="#ClientConfig">ClientConfig</a> : <code>object</code></dt>
<dd></dd>
</dl>

<a name="module_adlap"></a>

## adlap
<a name="adldapClient"></a>

## adldapClient
A simple `Promise` based interface to Active Directory backed by the `ldapjs`
library.

**Kind**: global constant  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| Change | <code>function</code> | Method from the `ldapjs` library to create change objects for use with [adldapClient#replace](adldapClient#replace). See the `ldapjs` client API documentation for information on this function. |


* [adldapClient](#adldapClient)
    * [.authenticate(username, password)](#adldapClient.authenticate) ⇒ <code>Promise</code>
    * [.bind()](#adldapClient.bind) ⇒ <code>Promise</code>
    * [.unbind()](#adldapClient.unbind) ⇒ <code>Promise</code>
    * [.findUser([username], [options])](#adldapClient.findUser) ⇒ <code>Promise</code>
    * [.replace(dn, change)](#adldapClient.replace) ⇒ <code>Promise</code>
    * [.replaceAttribute(dn, attribute, value)](#adldapClient.replaceAttribute) ⇒ <code>Promise</code>
    * [.incrementAttribute(cn, attribute)](#adldapClient.incrementAttribute) ⇒ <code>Promise</code>
    * [.search([base], [options], [controls])](#adldapClient.search) ⇒ <code>Promise</code>
    * [.userInGroup(username, groupName)](#adldapClient.userInGroup) ⇒ <code>Promise</code>

<a name="adldapClient.authenticate"></a>

### adldapClient.authenticate(username, password) ⇒ <code>Promise</code>
Attempt to authenticate a given user by attempting to bind using the
supplied credentials. Username formats accepted:

+ Simple: regular user name, e.g. `juser` for `Joe User`
+ Filter: an LDAP filter that resolves to the username
+ DN: the full LDAP DN for the user, e.g. `cn=juser,ou=users,dn=example,dn=com`.
+ Domain: an Active Directory style username, e.g. 'domain\user'
+ Principal: a user principal name, e.g. 'juser@domain'

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>boolean</code> On successful authentication `true`, otherwise `false`.  
**Reject**: <code>Error</code> When an unrecoverable error occurs, e.g. connection failure.  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The username for the user to authenticate. |
| password | <code>string</code> | The user's password. |

<a name="adldapClient.bind"></a>

### adldapClient.bind() ⇒ <code>Promise</code>
Bind to the directory using the search user's credentials. This method
must be invoked prior to any other method.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>\*</code> No value is returned on success.  
**Reject**: <code>Error</code> On bind failure an error is returned.  
<a name="adldapClient.unbind"></a>

### adldapClient.unbind() ⇒ <code>Promise</code>
Close the connection to the directory.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>\*</code> No value is returned on success  
**Reject**: <code>Error</code>  
<a name="adldapClient.findUser"></a>

### adldapClient.findUser([username], [options]) ⇒ <code>Promise</code>
Performs a search of the directory to find the user identified by the
given username.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>object</code> A user object with the properties specified in the
attributes option. The user returned is the first entry from a generic
search result set.  
**Reject**: <code>Error</code>  

| Param | Type | Description |
| --- | --- | --- |
| [username] | <code>string</code> | Either a simple name, e.g. 'juser', or an LDAP filter that should result in a single user. If it returns multiple users, only the first result will be returned. If omitted, a filter must be supplied in the `options`. Default: `(&(objectcategory=user)(sAMAccountName=username))`. |
| [options] | [<code>SearchOptions</code>](#SearchOptions) | Options to be used for the search. |

<a name="adldapClient.replace"></a>

### adldapClient.replace(dn, change) ⇒ <code>Promise</code>
A wrapper around the `ldapjs` library's `modify` method.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>undefined</code> Does not return anything on success.  
**Reject**: <code>Error</code>  

| Param | Type | Description |
| --- | --- | --- |
| dn | <code>string</code> | The full path to the object to modify. |
| change | <code>object</code> | An instance of `Change` from the `ldapjs` library describing the change to be made. The `Change` method is available via the `Change` property on the client. |

<a name="adldapClient.replaceAttribute"></a>

### adldapClient.replaceAttribute(dn, attribute, value) ⇒ <code>Promise</code>
Update an attribute at a specified path with a new value.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>undefined</code> No value is returned on success.  
**Reject**: <code>Error</code>  

| Param | Type | Description |
| --- | --- | --- |
| dn | <code>string</code> | The full path to the object that has the atribute to be modified. |
| attribute | <code>string</code> | The name of the attribute to change. |
| value | <code>\*</code> | Any valid LDAP attribute value, e.g. a string or an array of strings. |

**Example**  
```js
client.replaceAttribute('foobar', 'coolAttr', 'hello world')
```
<a name="adldapClient.incrementAttribute"></a>

### adldapClient.incrementAttribute(cn, attribute) ⇒ <code>Promise</code>
Update an attribute that is a number by incrementing its value by one.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>undefined</code> Does not return anything on success.  
**Reject**: <code>Error</code>  

| Param | Type | Description |
| --- | --- | --- |
| cn | <code>string</code> | The `CN` value for the object to modify. |
| attribute | <code>string</code> | The name of the attribute to increment. |

**Example**  
```js
client.incrementAttribute('foobar', 'myCounter')
```
<a name="adldapClient.search"></a>

### adldapClient.search([base], [options], [controls]) ⇒ <code>Promise</code>
Perform a generic LDAP query against the directory.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>Array</code> An array of search results.  
**Reject**: <code>Error</code>  

| Param | Type | Description |
| --- | --- | --- |
| [base] | <code>string</code> | The directory tree to use as the search root. Default: [LdapjsOptions#searchBase](LdapjsOptions#searchBase). |
| [options] | [<code>SearchOptions</code>](#SearchOptions) | Options to use during the search. |
| [controls] | <code>array</code> | A list of directory controls to use during the search. |

<a name="adldapClient.userInGroup"></a>

### adldapClient.userInGroup(username, groupName) ⇒ <code>Promise</code>
Query the directory to determine if a user is a member of a specified group.

**Kind**: static method of [<code>adldapClient</code>](#adldapClient)  
**Resolve**: <code>boolean</code> If the user is a member then `true`, otherwise `false`.  
**Reject**: <code>Error</code>  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | A username as described in [Client#findUser](Client#findUser). |
| groupName | <code>string</code> | The name of the group to verify. Can be a partial match. |

<a name="init"></a>

## init([$log]) ⇒ <code>clientFactory</code>
Initialize the module with a logger and return a client factory function.
If no logger instance is provided, a noop logger will be used.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| [$log] | <code>object</code> | A logger that conforms to the Log4j interface. |

<a name="init..clientFactory"></a>

### init~clientFactory(config) ⇒ [<code>adldapClient</code>](#adldapClient)
Build an adldap instance.

**Kind**: inner method of [<code>init</code>](#init)  
**Throws**:

- <code>Error</code> When an invalid configuration object is supplied.


| Param | Type | Description |
| --- | --- | --- |
| config | [<code>ClientConfig</code>](#ClientConfig) | Required configuration object to configure the client. |

<a name="SearchOptions"></a>

## SearchOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| filter | <code>string</code> | A valid LDAP filter to use as the query. |
| searchBase | <code>string</code> | The base tree to search through. Default: [LdapjsOptions#searchBase](LdapjsOptions#searchBase) |
| scope | <code>string</code> | The search scope to use. Can be 'base', 'one', or 'sub'. Default: [LdapjsOptions#scope](LdapjsOptions#scope). |
| array | <code>attributes</code> | Default list of attributes to return from searches. Default: [LdapjsOptions#attributes](LdapjsOptions#attributes). |

<a name="LdapjsOptions"></a>

## LdapjsOptions : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | The address of the LDAP (AD) server to connect to. This property is required if `socketPath` is not set. |
| socketPath | <code>string</code> | A Unix socket path to connect to. |
| searchBase | <code>string</code> | The base tree to search through. Can be overriden via options on certain methods. |
| scope | <code>string</code> | The search scope to use. Can be 'base', 'one', or 'sub'. Default: 'base'. |
| array | <code>attributes</code> | Default list of attributes to return from searches. Default: `['dn', 'cn', 'sn', 'givenName', 'mail', 'memberOf']` |
| tlsOptions | <code>object</code> | Standard Node.js TLS options to pass to ldapjs. |

<a name="ClientConfig"></a>

## ClientConfig : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| searchUser | <code>string</code> | User to bind as that will be used to search the directory. |
| searchUserPass | <code>string</code> | The password for the `searchUser`. |
| ldapjs | <code>LdapjsConfig</code> | Default options to pass to `ldapjs` methods. |

