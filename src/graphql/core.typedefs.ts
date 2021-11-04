// defined in its own standalone file, for `graphql-codegen` purposes

/*
  https://github.com/apollographql/apollo-tooling
    "GraphQL Code Generator supports:
      - ES Modules and CommonJS exports (export as default or named export "schema")
      - ..."
    we've found it to be sensitive RE: the code it can parse
      "Unable to load from file "...": Unexpected token {
    we've found that this is the safest approach.

  here's how to leverage this file:

```yaml
generates:
  ./path/to/generated.file.ts:
    schema:
      - "node_modules/@withjoy/server-core/dist/graphql/core.typedefs.js"
```
*/

export { coreTypeDefs as default } from './core.types';
