import * as TypeMoq from 'typemoq';
import { ConnectionOptions } from 'typeorm';
import { omit } from 'lodash';
import { telemetry, Telemetry } from '@withjoy/telemetry';

import { commonLogInformation } from '../const';
import {
  logTypeORMConfig,
} from './index';


describe('typeorm/index', () => {
  let telemetryMock: TypeMoq.IMock<Telemetry>;
  let telemetryInfo: Function;

  beforeEach(() => {
    telemetryMock = TypeMoq.Mock.ofType(Telemetry);

    // guess what framework doesn't support stubbing of a shared singleton?
    //   @see 'src/middleware/error.logging.spec.ts'
    telemetryInfo = telemetry.info;
    telemetry.info = telemetryMock.object.info.bind(telemetryMock.object);
  });

  afterEach(() => {
    telemetryMock.verifyAll();

    Reflect.set(telemetry, 'info', telemetryInfo);
  });


  describe('logTypeORMConfig', () => {
    it('will not log the password', () => {
      const config = {
        type: 'postgres',
        host: 'POSTGRES_HOST',
        port: 5432,
        username: 'POSTGRES_USER',
        password: 'POSTGRES_PASSWORD',
        database: 'POSTGRES_DATABASE',
      } as ConnectionOptions;

      telemetryMock.setup((mocked) => mocked.info('logTypeORMConfig', {
        ...commonLogInformation(),

        config: JSON.stringify( omit(config, 'password') ),
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      logTypeORMConfig(config);
    });
  });
});
