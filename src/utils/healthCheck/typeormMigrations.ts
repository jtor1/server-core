/* istanbul ignore file */
//   it('is covered in @withjoy/server-core-test, with a backing database', noop);

import { difference } from 'lodash';
import { getConnection } from 'typeorm';
import { Migration } from 'typeorm/migration/Migration';
import { MigrationExecutor } from 'typeorm/migration/MigrationExecutor';
import { deriveTelemetryContextFromError } from "@withjoy/telemetry";

import { Context } from '../../server/apollo.context';


export async function healthCheckerTypeormMigrations(context: Context): Promise<boolean> {
  const { telemetry } = context;

  try {
    const connection = getConnection();
    const allMigrationNames = connection.migrations.map((migrationScript) => migrationScript.constructor.name);

    const migrationExecutor: MigrationExecutor = new MigrationExecutor(connection);
    const executedMigrations: Migration[] = await (<any>migrationExecutor).loadExecutedMigrations(); // de-protected method
    const executedMigrationNames = executedMigrations.map((migration) => migration.name);

    const unexecuted = difference(allMigrationNames, executedMigrationNames);
    if (unexecuted.length !== 0) {
      throw new Error(`unexecuted TypeORM Migrations: ${ JSON.stringify(unexecuted) }`);
    }
    return true;
  }
  catch (error) {
    telemetry.error('healthCheckerTypeormMigrations: failure', {
      ...deriveTelemetryContextFromError(error),
      source: 'healthCheck',
      action: 'typeormMigrations',
    });
    return false;
  }
}
