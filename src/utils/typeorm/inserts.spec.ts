import { noop } from 'lodash';

describe('utils/typeorm/inserts', () => {
  // everything we could cover here is 'toothless';
  //   true coverage requires a representative backing database,
  //   and we don't want to create a circular dependency with @withjoy/server-core-test
  //   so ...

  describe('insertQueryBuilderForModels', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('upsertQueryBuilderForModels', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('upsertForInsertQueryBuilder', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('executeInsertQueryBuilderForModels', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });
});
