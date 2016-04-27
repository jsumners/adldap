# adldap

This is a simple wrapper around [ldapjs][ldapjs] for basic operations against
an Active Directory instance. If you're looking for a robust interface, you
may be interested in [activedirectory2][ad2].

What can you do with `adldap`?

+ Issue generic searches
+ Find users
+ Authenticate arbitrary users
+ Determine if a user is a member of a specific group

This library was written because `activedirectory2` pulls back too much data
when retreiving groups. I merely need the list of names; `activedirectory2`
pulls back much more information than that.

If I ever get the time and desire, I may flesh out this library more. Pull
requests are always welcome.

[ldapjs]: https://www.npmjs.com/package/ldapjs
[ad2]: https://www.npmjs.com/package/activedirectory2

## Example

```javascript
const Client = require('adlap')();
const client = new Client({
  searchUser: 'dn=Generic Searcher,ou=accounts,dn=example,dn=com',
  searchUserPass: 'supersecret',
  ldapjs: {
    url: 'ldaps://ad.example.com'
  }
});

// You must bind before you can do anything else.
client.bind()
  .then(() => {
    client.findUser('someUser')
      .then((user) => console.log(user.memberOf))
      .catch((err) => console.error(err))
      .then(() => client.unbind());
  })
  .catch((err) => console.error(err));
```

## Config

+ `searchUser`: A fully qualified DN to a user that can perform searches against
  your Active Directory.
+ `searchUserPass`: The search user's password, obviously.
+ `ldapjs`
  + `url`: The URL to your Active Directory in LDAP format.
  + `searchBase`: Default search base to use for all searches unless overridden
    by a method's options. (optional)
  + `scope`: The default search scope to use for all searches unless overridden
    by a method's options. Can be 'base', 'one', or 'sub'. Defaults to 'base'.
    (optional)
  + `attributes`: An array of default attributes to return with searches.
    The default list is `['dn', 'cn', 'sn', 'givenName', 'mail', 'memberOf']`.
    If overridden by a method, you must supply the complete list of attributes
    you want. (optional)

## Methods

The full documentation is included in the [api.md](api.md) document.

+ `authenticate(username, password)`
+ `bind()`
+ `findUser(username, options)`
+ `search(base, options, controls)`
+ `unbind()`
+ `userInGroup(username, groupName)`

## License

[MIT License](http://jsumners.mit-license.org/)
