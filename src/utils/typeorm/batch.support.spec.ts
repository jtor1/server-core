import { noop } from 'lodash';

describe('utils/typeorm/batch.support', () => {
  // everything we could cover here is 'toothless';
  //   true coverage requires a representative backing database,
  //   and we don't want to create a circular dependency with @withjoy/server-core-test
  //   so ...

  describe('applyDefaultEntityValues', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuilderToInsertModels', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuildersToForceKeysOfModels', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('injectSequenceKeysIntoModels', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuilderToDeleteModelById', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuilderToDeleteModelsBySelectedIds', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuilderToDeleteModelsByParentId', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuildersToInsertManyToManyJunctions', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });

  describe('queryBuildersToDeleteManyToManyJunctionsByParentId', () => {
    it('is covered in @withjoy/server-core-test, with a backing database', noop);
  });
});
