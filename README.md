# server-core


## Development w/ `npm link` (or `yarn link`)

You may see the following when trying to use `npm link` and co-develop this module and one of our Apps (eg. `event_service`):

```
Duplicate "graphql" modules cannot be used at the same time since different
versions may have different capabilities and behavior. The data from one
version used in the function from another could produce confusing and
spurious results.
```

Or, maybe this:

```
error TS2322: Type 'import("/Users/dfoley/src/withjoy/server-core/node_modules/@types/graphql/type/schema").GraphQLSchema' is not assignable to type 'import("/Users/dfoley/src/withjoy/event_service/node_modules/@types/graphql/type/schema").GraphQLSchema'.
  Types of property 'getQueryType' are incompatible.
```

To fix this problem, symlink the App's `graphql` module into `service-core`;

```bash
# from the shared parent directory of both repos,
rm -rf server-core/node_modules/graphql
ln -s FULL/PATH/TO/event_service/node_modules/graphql server-core/node_modules

rm -rf server-core/node_modules/@types/graphql
ln -s FULL/PATH/TO/event_service/node_modules/@types/graphql server-core/node_modules/@types
```

This is because `graphql` and all of the Apollo modules need to stay in close alignment;
that's why we've pinned to *specific versions* in `server-core` and all of the Apps that utilize it.
You'll also see `graphql` in this module's `peerDependencies`.

