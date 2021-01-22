import { noop } from 'lodash';

describe('utils/typeorm/migration', () => {
  // everything we could cover here is 'toothless';
  //   true coverage requires a representative backing database,
  //   and we don't want to create a circular dependency with @withjoy/server-core-test
  //   so ...

  describe('migrateWithPostgresSettings', () => {
    it('is covered in @withjoy/server-test-core, with a backing database', noop);
  });

  describe('migrateWithoutTransaction', () => {
    it('is covered in @withjoy/server-test-core, with a backing database', noop);
  });
});
