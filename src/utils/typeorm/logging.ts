import { ConnectionOptions } from 'typeorm';
import { pick } from 'lodash';
import { telemetry } from '@withjoy/telemetry';

import { commonLogInformation } from '../const';


const PROPERTIES_TO_LOG = [ 'type', 'host', 'port', 'username', 'database' ];


// NOTE:  feel free to move this
export function logTypeORMConfig(config: ConnectionOptions) {
  const commonLogInfo = commonLogInformation();
  const loggedConfig = pick(config, PROPERTIES_TO_LOG);

  telemetry.info('logTypeORMConfig', {
    ...commonLogInfo,

    config: JSON.stringify(loggedConfig), // not parsed during log ingestion
  })
}
