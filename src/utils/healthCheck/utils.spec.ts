import {
  createSandbox,
  match as sinonMatcher,
  SinonMock,
} from 'sinon';

import { Context } from '../../server/apollo.context';
import {
  HealthCheckState,
  healthCheckForPredicate,
} from './utils';


const CONTEXT = new Context();

describe('utils/healthCheck', () => {
  const sandbox = createSandbox();
  let telemetryMock: SinonMock;

  beforeEach(() => {
    telemetryMock = sandbox.mock(CONTEXT.telemetry);
    telemetryMock.expects('error').never(); // happy-path
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });


  describe('HealthCheckState', () => {
    it('is dead simple', async () => {
      const state = new HealthCheckState();

      // it('is assumed healthy')
      expect(state.value).toBe(true);
      expect(await state.healthChecker()).toBe(true);

      // it('becomes unhealthy')
      state.set(false);

      expect(state.value).toBe(false);
      expect(await state.healthChecker()).toBe(false);
    });
  });


  describe('healthCheckForPredicate', () => {
    it('succeeds', async () => {
      const healthChecker = healthCheckForPredicate(() => Promise.resolve(true));
      expect(await healthChecker(CONTEXT)).toBe(true);
    });

    it('fails', async () => {
      const healthChecker = healthCheckForPredicate(() => Promise.resolve(false));
      expect(await healthChecker(CONTEXT)).toBe(false);
    });

    it('fails with an Error', async () => {
      // it('logs the Error')
      telemetryMock.expects('error').once().withArgs(
        'healthCheckForPredicate: failure',
        sinonMatcher({
          error: {
            message: sinonMatcher(/BOOM/),
          },
          predicate: 'namedPredicate',
        })
      );

      const namedPredicate = () => Promise.reject(new Error('BOOM'));
      const healthChecker = healthCheckForPredicate(namedPredicate);
      expect(await healthChecker(CONTEXT)).toBe(false);
    });
  });
});
