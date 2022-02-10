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

> The `npm-shrinkwrap.json` should be treated with care;
> more on that below.

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

# install Node 6 modules from `npm-shrinkwrap.json`, then rebuild the source
npm install
npm run node6:build

# build & run the Test Suite
npm run node6:test:build
npm run node6:test:run
```

And once it's all passing,

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

These files are related, but won't change often (if ever)

- `tsconfig.node6-test.json`
- `.circleci/config.yml`




### Be Careful With 'npm-shrinkwrap.json'

Basically:  **leave it alone**.  It's stable (for now).

It's a real hassle to rebuild it, and hard to communicate "how" in a README.
The last time we needed to update it -- @see `git blame` --
was because we forgot to pass `--dev`, so our devDependencies weren't being shrinkwrapped.
And, of course, the Test Suite started to fail for no good reason.

To rebuild the shrinkwrap from scratch, you'll want to:

```bash
# the `npm-shrinkwrap.json` generated from Node 10 depencies cannot be installed in Node 6
nvm use 6

npm install
npm run node6:build
npm run node6:build:relock
```

You'll get complaints, and you'll need to resolve them before it can generate the file.
Some strategies that worked for me were:

- for "ERR! invalid: have foo@1.2.3 (expected: ^4.5.6)"
  - `npm install --save` the version it asks for ... even if it's `devDependencies`
  - (it's that simple)
- for "WARN foo@1.2.3 requires a peer of bar@^2.4.6 but none was installed"
  - take steps above, if possible
  - if you can't install it ... create a minimal 'node_modules/bar/package.json' based upon some other installed package.
  - all you need are the lines / sections where it refers to the package name or desired version
  - it only needs to be as good as the point where `npm shrinkwrap` will trust it
  - then manually add the name + version combo to `dependencies`

The end result *does not need to be representative* of the Node 10 installation.
You just need to generate something roughly equivalent that works.

And once it's all passing,

- revert any changes to `package.json`
- remove any hacked peerDependencies from `npm-shrinkwrap.json` (they're likely empty except for the version number)
- commit the new `npm-shrinkwrap.json`


## CircleCI

Its Project uses the following Environment Variables:

- NPM_TOKEN, which must have Publish rights
