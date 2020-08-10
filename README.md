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


## Node 6 Support

> NOTE:  CircleCI runs the Test Suites for both Engines.

If you want a feature to be exposed to `app-server-api`, it must be compatible with the Node 6 engine.

The `require` syntax for Node 6 compatible features is:

```javascript
const { ... } = require("@withjoy/server-core/dist/node6");
```

### What To Do

You only need to worry about dealing with Node 6 Support when you're going to expose a new version to `app-server-api`.
As long as the monorepo doesn't upgrade its version, you can pretend that Node 6 Support *isn't there*.

Make sure to keep these files in-sync:

- `src/node6`, for selective exports
- `mocha-node6.opts`, for their matching Test Suite coverage

And here's the basic process:

```bash
nvm use 6  # ... obviously

# rebuild the source & `npm-shrinkwrap.json`
npm run node6:build

# build & run the Test Suite
npm run node6:test:build
npm run node6:test:run
```

And once it's all passing,

- commit the new `npm-shrinkwrap.json` (etc.)
- push your changes
- version + publish from within Node 10

### Support Tooling

It's somewhat fragile;

- we are using both `npm` and `yarn` in Node 6
  - yes, the same version of `yarn` that we use in Node 10
- the Node 10 version of `jest` won't launch in Node 6
  - so we use `mocha` + `chai`
  - `mocha@5`, because
    - there's no `@types/mocha@6`
    - `mocha@6` doesn't run on Node 6 (for the same reason as `jest`)
  - and we compile with `jest`s global DSL (`describe`, etc.) because it's identical to `mocha`s
- we use `tsc` to build / transpile in Node 6
  - we publish the **Node 10 transpiled versions**, which work fine in Node 6
  - however, the *Test Suite* is written in TypeScript, and it is *not* built as part of `dist/*`
- the `npm-shrinkwrap.json` generated from Node 10 depencies cannot be installed in Node 6
  - so it has to be re-built from within the Node 6 engine

These files are related, but won't change often (if ever)

- `tsconfig.node6-test.json`
- `.circleci/config.yml`
