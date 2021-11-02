# server-core


## Publishing the Module

To publish a new version of this module,

- *do not* up-version on your development branch
- merge your fixes into `master`
- from the `master` branch,

```
yarn version --patch  # or whatever is suitable
```

As a follow-up,

- `package.json` is up-versioned
- a semver-ish tag is pushed to Git
- CircleCI will perform the `yarn publish` operation when it detects the tag
- it's ready once the 'versions' in `yarn info @withjoy/server-core` have been updated


## Integrating / Upgrading the Module

### Before You Publish

When you're doing trial runs of the built package,
using the 'file://' protocol and the file TGZ output by `yarn pack` is the recommended strategy.
Please see [Developing Node Modules](https://withjoy.atlassian.net/wiki/spaces/KNOW/pages/1545896147/Developing+Node+Modules).

PS. it's okay to replace the `{ dependencies }` wildcard for testing purposes,
but that **is not** the approach for upgrading to the published version -- see below.

### The Published Module

'server-core' and 'server-core-test' are interdependent in a way that makes `package.json` resolutions complicated.
Each one advances forward on its own version timeline,
while 'server-core-test' also provides a extended Test Suite for 'server-core'.

To address this, our `package.json` files are configured as follows:
```json
{
  "resolutions": {
    "@withjoy/server-core": "^X.X.X",
    ...
  },
  "dependencies": {
    "@withjoy/server-core": "*", // <= wildcard
    ...
  },
  "devDependencies": {
    "@withjoy/server-core-test": "^X.X.X",
    ...
  }
}
```

To upgrade 'server-core'

- call out the new version in `{ resolutions }` -- *(leave the wildcard alone)*
- `yarn install`
- confirm that your `yarn.lock` has been updated accordingly

If experience problems trying to `import { }` the newly-published code, you may need to

- hand-edit the `yarn.lock` file and remove all the disparate '@withjoy/server-core' versions
- `yarn install` again

You should be in good shape after that.

PS. upgrading 'server-core-test' is easy; it follows typical version specification patterns.


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
# fresh clone of the repo
#   so as not to conflict with Node 10's installed `node_modules`
git clone git@github.com:joylifeinc/server-core.git
cd server-core

nvm use 6  # ... obviously

# install Node 6 modules, then rebuild the source & `npm-shrinkwrap.json`
npm install
npm run node6:build

# or, when you're forced to update the shrinkwrap,
npm run node6:build:relock

# build & run the Test Suite
npm run node6:test:build
npm run node6:test:run
```

And once it's all passing,

- commit the new `npm-shrinkwrap.json` (etc.)
- push your changes
- version + publish from within Node 10

### Build Tooling

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
  - however, the *Test Suite* is written in TypeScript, and it is *not* built as part of `dist/*` --
    instead, it transpiles into `build/*`, which is *not* "dist"ributed
- the `npm-shrinkwrap.json` generated from Node 10 depencies cannot be installed in Node 6
  - so it has to be re-built from within the Node 6 engine

These files are related, but won't change often (if ever)

- `tsconfig.node6-test.json`
- `.circleci/config.yml`


## CircleCI

Its Project uses the following Environment Variables:

- NPM_TOKEN, which must have Publish rights
