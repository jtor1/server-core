/* istanbul ignore file */
//   it('is covered in @withjoy/server-test-core, with a backing database', noop);

import { QueryRunner } from 'typeorm';
const { prepareValue: pgPrepareValue } = require('pg/lib/utils');

import { executeOperationsInParallel } from '../miscellaneous';


export type MigrationPostgresSettings = Record<string, any> & {
  // call out likely properties
  statement_timeout?: number | string,  // default unit = ms
  lock_timeout?: number | string,  // default unit = ms
};
export type MigrationFunction = (queryRunner: QueryRunner) => Promise<any>;


export async function migrateWithPostgresSettings(
  queryRunner: QueryRunner,
  settings: MigrationPostgresSettings,
  migration: MigrationFunction
) {
  const oldValueMap = new Map<string, any>();

  await executeOperationsInParallel(Object.keys(settings), async (name) => {
    // preserve the old
    const [ result ] = await queryRunner.query(`SHOW "${ name }"`);
    if (! result) {
      return;
    }
    oldValueMap.set(name, result[name]);

    // apply the new (as a String)
    const newValue = settings[name];
    await queryRunner.query(`SET "${ name }" TO '${ pgPrepareValue(newValue) }'`);
  });

  try {
    return await migration(queryRunner);
  }
  finally {
    try {
      // restore anything we changed
      await executeOperationsInParallel(Array.from( oldValueMap.keys() ), async (name) => {
        const oldValue = oldValueMap.get(name);
        await queryRunner.query(`SET "${ name }" TO '${ pgPrepareValue(oldValue) }'`);
      });
    }
    catch (err) {
      // without blowing up the Migration as a whole should it fail
    }
  }
}


export async function migrateWithoutTransaction(queryRunner: QueryRunner, migration: MigrationFunction) {
  const wasTransactionActive = queryRunner.isTransactionActive;
  if (wasTransactionActive) {
    // commit immediately
    await queryRunner.commitTransaction();
  }

  try {
    // "QueryFailedError: CREATE INDEX CONCURRENTLY cannot run inside a transaction block"
    return await migration(queryRunner);
  }
  finally {
    try {
      // restore to a new Transaction if needed
      if (wasTransactionActive) {
        await queryRunner.startTransaction();
      }
    }
    catch (err) {
      // without blowing up the Migration as a whole should it fail
    }
  }
}
