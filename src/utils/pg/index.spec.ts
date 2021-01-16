import { noop } from 'lodash';

describe('utils/pg', () => {
  // everything here is Postgres-dialect-specific
  //   `sqlite3` won't cut it
  //   and we don't want to create a circular dependency with @withjoy/server-core-test
  //   just to get ourselves a representative backing database
  //   so ...

  describe('pgInlineParametersIntoQuery', () => {
    it('is covered in @withjoy/server-test-core, with a backing database', noop);
  });

  describe('pgDeriveQueryBuilderStatements', () => {
    it('is covered in @withjoy/server-test-core, with a backing database', noop);
  });

  describe('pgCombineStatements', () => {
    it('is covered in @withjoy/server-test-core, with a backing database', noop);
  });

  describe('pgQueryBuilderBatchStatement', () => {
    it('is covered in @withjoy/server-test-core, with a backing database', noop);
  });
});
