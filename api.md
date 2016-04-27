## Classes

<dl>
<dt><a href="#Client">Client</a></dt>
<dd></dd>
<dt><a href="#Response">Response</a></dt>
<dd></dd>
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

<a name="Client"></a>

## Client
**Kind**: global class  

* [Client](#Client)
    * [new Client(config)](#new_Client_new)
    * [.authenticate(username, password)](#Client+authenticate) ⇒ <code>Promise</code>
    * [.bind()](#Client+bind) ⇒ <code>Promise</code>
    * [.findUser([username], [options])](#Client+findUser) ⇒ <code>Promise.&lt;object&gt;</code>
    * [.search([base], [options], [controls])](#Client+search) ⇒ <code>Promise</code>
    * [.unbind()](#Client+unbind) ⇒ <code>Promise</code>
    * [.userInGroup(username, groupName)](#Client+userInGroup) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="new_Client_new"></a>

### new Client(config)
A simple `Promise` based interface to Active Directory backed by the `ldapjs`
library.


| Param | Type | Description |
| --- | --- | --- |
| config | <code>[ClientConfig](#ClientConfig)</code> | Required configuration object to configure the client. |

<a name="Client+authenticate"></a>

### client.authenticate(username, password) ⇒ <code>Promise</code>
Attempt to authenticate a given user by attempting to bind using the
supplied credentials. Username formats accepted:

+ Simple: regular user name, e.g. `juser` for `Joe User`
+ Filter: an LDAP filter that resolves to the username
+ DN: the full LDAP DN for the user, e.g. `cn=juser,ou=users,dn=example,dn=com`.
+ Domain: an Active Directory style username, e.g. 'domain\user'

**Kind**: instance method of <code>[Client](#Client)</code>  
**Returns**: <code>Promise</code> - Resolves with a value of `true` on success, `false` on
failure, and rejects with an `Error` if an unrecoverable error occurs.  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | The username for the user to authenticate. |
| password | <code>string</code> | The user's password. |

<a name="Client+bind"></a>

### client.bind() ⇒ <code>Promise</code>
Bind to the directory using the search user's credentials. This method
must be invoked prior to any other method.

**Kind**: instance method of <code>[Client](#Client)</code>  
**Returns**: <code>Promise</code> - Resolves with no value on success, rejects with an
`Error` on failure.  
<a name="Client+findUser"></a>

### client.findUser([username], [options]) ⇒ <code>Promise.&lt;object&gt;</code>
Performs a search of the directory to find the user identified by the
given username.

**Kind**: instance method of <code>[Client](#Client)</code>  
**Returns**: <code>Promise.&lt;object&gt;</code> - A user object with the properties specified in the
attributes option.  

| Param | Type | Description |
| --- | --- | --- |
| [username] | <code>string</code> | Either a simple name, e.g. 'juser', or an LDAP filter that should result in a single user. If it returns multiple users, only the first result will be returned. If omitted, a filter must be supplied in the `options`. Default: `(&(sAMAccountName=username)(objectClass=person))`. |
| [options] | <code>[SearchOptions](#SearchOptions)</code> | Options to be used for the search. |

<a name="Client+search"></a>

### client.search([base], [options], [controls]) ⇒ <code>Promise</code>
Perform a generic LDAP query against the directory.

**Kind**: instance method of <code>[Client](#Client)</code>  
**Returns**: <code>Promise</code> - Resolves to a [Response](#Response) on success, rejects with
an `Error` on failure.  

| Param | Type | Description |
| --- | --- | --- |
| [base] | <code>string</code> | The directory tree to use as the search root. Default: [LdapjsOptions#searchBase](LdapjsOptions#searchBase). |
| [options] | <code>[SearchOptions](#SearchOptions)</code> | Options to use during the search. |
| [controls] | <code>array</code> | A list of directory controls to use during the search. |

<a name="Client+unbind"></a>

### client.unbind() ⇒ <code>Promise</code>
Close the connection to the directory.

**Kind**: instance method of <code>[Client](#Client)</code>  
**Returns**: <code>Promise</code> - Resolves with an empty value on success, rejects with
an `Error` on failure.  
<a name="Client+userInGroup"></a>

### client.userInGroup(username, groupName) ⇒ <code>Promise.&lt;boolean&gt;</code>
Query the directory to determine if a user is a member of a specified group.

**Kind**: instance method of <code>[Client](#Client)</code>  
**Returns**: <code>Promise.&lt;boolean&gt;</code> - Resolves with a `true` or `false` based on the
user's membership, rejects with an `Error` on failure.  

| Param | Type | Description |
| --- | --- | --- |
| username | <code>string</code> | A username as described in [findUser](#Client+findUser). |
| groupName | <code>string</code> | The name of the group to verify. Can be a partial match. |

<a name="Response"></a>

## Response
**Kind**: global class  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| entries | <code>array</code> | The list of search results. |
| referrals | <code>array</code> | A list of referral URLs returned by the server. |

<a name="new_Response_new"></a>

### new Response(res)
A wrapper around ldapjs's search result events. This wrapper exposes events:

+ `tcperror`: maps to ldapjs's `error` event for search results.
+ `ldaperror`: emitted when the ldapjs `end` event has fired and the
   result status is anything other than `0`.
+ `complete`: emitted when all search entries have been returned and the
   ldapjs `end` event has fired. At this point you can retrieve the
   `entries` and/or `referrals` from your instance of {@code Response}.


| Param | Type | Description |
| --- | --- | --- |
| res | <code>object</code> | An ldapjs search result event emitter. |

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
| url | <code>string</code> | The address of the LDAP (AD) server to connect to. |
| searchBase | <code>string</code> | The base tree to search through. Default: `null`. |
| scope | <code>string</code> | The search scope to use. Can be 'base', 'one', or 'sub'. Default: 'base'. |
| array | <code>attributes</code> | Default list of attributes to return from searches. Default: `['dn', 'cn', 'sn', 'givenName', 'mail', 'memberOf']` |

<a name="ClientConfig"></a>

## ClientConfig : <code>object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| searchUser | <code>string</code> | User to bind as that will be used to search the directory. |
| searchUserPass | <code>string</code> | The password for the `searchUser`. |
| ldapjs | <code>LdapjsConfig</code> | Default options to pass to `ldapjs` methods. |

