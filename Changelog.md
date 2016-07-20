### 1.0.0
+ update to [standardjs.com](http://standardjs.com) code style
+ add fairly comprehensive tests
+ `authenticate()` default filter changed to `(&(objectcategory=user)(samaccountname=username))`
+ add support for connecting via Unix domain socket
+ switch to [Bluebird](http://bluebirdjs.com) promise library for more performance
