### 3.0.1
+ Fix for usernames tha start with `cn` or `dn` not being processed correctly

### 3.0.0
+ Update dependencies
+ Refactor code into object literals
+ Breaking change: switch logger to `abstract-logging`
+ Switch testing framework to `node-tap` and remove `gulp` ecosystem
+ Fix `#authenticate` not returning `false` for invalid credentials errors

### 2.0.0
+ Breaking change: alters the `search` method to handle the `Response` events
  internally. The result of the `search` method is now a `Promise` that either
  resolves to an array of search results or rejects with an `Error`.
+ Update dependencies

### 1.0.1
+ In some instances the `authenticate` method would not return. This seems to
  be because Bluebird's `coroutine` doesn't support `yield *`; though, I'm not
  certain of that. In any event, this fix resolves the issue.

### 1.0.0
+ update to [standardjs.com](http://standardjs.com) code style
+ add fairly comprehensive tests
+ `authenticate()` default filter changed to `(&(objectcategory=user)(samaccountname=username))`
+ add support for connecting via Unix domain socket
+ switch to [Bluebird](http://bluebirdjs.com) promise library for more performance
