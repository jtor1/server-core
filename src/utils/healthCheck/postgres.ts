/* istanbul ignore file */
//   it('is covered in @withjoy/server-core-test, with a backing database', noop);

import { getConnection } from 'typeorm';
import { isNumber } from 'lodash';
import { deriveTelemetryContextFromError } from '@withjoy/telemetry';

import { Context } from '../../server/apollo.context';


export async function healthCheckerPostgres(context: Context): Promise<boolean> {
  const { telemetry } = context;

  try {
    // Posgres should be able to tell us its current time-of-day
    // FUTURE:  use Postgres as a reliable source-of-truth RE: server time
    const results = await getConnection().query('SELECT FLOOR(EXTRACT(epoch FROM now()) * 1000) AS milliseconds');
    if (! isNumber(results[0].milliseconds)) {
      throw new Error('Postgres cannot provide the current time');
    }
    return true;
  }
  catch (error) {
    telemetry.error('healthCheckerPostgres: failure', {
      ...deriveTelemetryContextFromError(error),
      source: 'healthCheck',
      action: 'postgres',
    });
    return false;
  }
}
