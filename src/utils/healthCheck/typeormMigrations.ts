/* istanbul ignore file */
//   it('is covered in @withjoy/server-core-test, with a backing database', noop);

import assert from 'assert';
import { difference } from 'lodash';
import { getConnection } from 'typeorm';
import { Migration } from 'typeorm/migration/Migration';
import { MigrationExecutor } from 'typeorm/migration/MigrationExecutor';
import { deriveTelemetryContextFromError } from "@withjoy/telemetry";

import { Context } from '../../server/apollo.context';


export async function healthCheckerTypeormMigrations(context: Context): Promise<boolean> {
  const { telemetry } = context;
  const timeAtStart = Date.now();

  try {
    // officially part of `typeorm`
    const connection = getConnection();
    const allMigrationNames = connection.migrations.map((migrationScript) => migrationScript.constructor.name);

    // unofficial -- make sure it's supported when called
    assert.ok(MigrationExecutor?.prototype['loadExecutedMigrations'], 'expected MigrationExecutor#loadExecutedMigrations');
    const migrationExecutor: MigrationExecutor = new MigrationExecutor(connection);
    // "Property 'loadExecutedMigrations' is protected and only accessible within class 'MigrationExecutor' and its subclasses.ts(2445)"
    const migrationExecutorAsAny = (migrationExecutor as any);
    const executedMigrations: Migration[] = await migrationExecutorAsAny.loadExecutedMigrations();
    const executedMigrationNames = executedMigrations.map((migration) => migration.name);

    if ((allMigrationNames.length === 0) && (executedMigrationNames.length !== 0)) {
      throw new Error(`found 0 TypeORM Migrations files; check your TypeORM { migrations } config`);
    }

    const unexecuted = difference(allMigrationNames, executedMigrationNames);
    if (unexecuted.length !== 0) {
      throw new Error(`unexecuted TypeORM Migrations: ${ JSON.stringify(unexecuted) }`);
    }
    return true;
  }
  catch (error) {
    const durationMs = Date.now() - timeAtStart; // mostly for timeouts
    telemetry.error('healthCheckerTypeormMigrations: failure', {
      ...deriveTelemetryContextFromError(error),
      source: 'healthCheck',
      action: 'typeormMigrations',
      durationMs,
    });

    return false;
  }
}
