import {
  createSandbox,
  expectation,
  match as sinonMatcher,
  SinonExpectation,
  SinonMock,
  SinonFakeTimers,
} from 'sinon';
import { noop } from 'lodash';
import {
  createRequest,
  createResponse,
  MockRequest,
  MockResponse,
} from 'node-mocks-http';
import { Request, Response } from 'express';

import { Context, injectContextIntoRequestMiddleware } from '../../server/apollo.context';
import { HealthCheckState } from './utils';
import { HealthChecker } from './types';
import { FAKE_TIMERS_MS } from '../../../test/helpers/const';
import {
  createHealthCheckRequestHandler,
} from './requestHandler';

const CONTEXT = new Context();
const CONTEXT_MIDDLEWARE = injectContextIntoRequestMiddleware(() => CONTEXT);
function _injectContext(req: Request, res: Response) {
  CONTEXT_MIDDLEWARE(req, res, noop);
}

const NO_CHECKERS = Object.freeze({ checkers: {} });
const GOOD = new HealthCheckState();
const BAD = new HealthCheckState();
BAD.set(false);
const BOOM_CHECKER: HealthChecker = () => Promise.reject(new Error('BOOM'));


describe('utils/healthCheck', () => {
  const sandbox = createSandbox();
  let fakeTimers: SinonFakeTimers;

  beforeEach(() => {
    fakeTimers = sandbox.useFakeTimers({
      now: FAKE_TIMERS_MS,
      // toFake:  **everything** ... to make Promises go!
    });
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });


  describe('createHealthCheckRequestHandler', () => {
    let req: MockRequest<Request>;
    let res: MockResponse<Response>;
    let next: SinonExpectation;
    let telemetryMock: SinonMock;

    beforeEach(() => {
      req = createRequest();
      res = createResponse();

      next = expectation.create();
      next.never(); // happy-path

      telemetryMock = sandbox.mock(CONTEXT.telemetry);
      telemetryMock.expects('error').never(); // happy-path
    });


    it('succeeds with a successful check', async () => {
      const requestHandler = createHealthCheckRequestHandler({
        checkers: {
          success: GOOD.healthChecker,
        },
      });
      _injectContext(req, res);
      await requestHandler(req, res, next);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe(JSON.stringify({
        success: true,
      }));
    });

    it('fails with any one failing check', async () => {
      const requestHandler = createHealthCheckRequestHandler({
        checkers: {
          success: GOOD.healthChecker,
          good: GOOD.healthChecker,
          bad: BAD.healthChecker,
        },
      });
      _injectContext(req, res);
      await requestHandler(req, res, next);

      expect(res._getStatusCode()).toBe(500);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe(JSON.stringify({
        success: true,
        good: true,
        bad: false,
      }));
    });

    it('fails when a check throws', async () => {
      // it('logs the Error')
      telemetryMock.expects('error').once().withArgs(
        'requestHandler: failure',
        sinonMatcher({
          error: {
            message: sinonMatcher(/BOOM/),
          },
          key: 'boom',
        })
      );

      const requestHandler = createHealthCheckRequestHandler({
        checkers: {
          success: GOOD.healthChecker,
          boom: BOOM_CHECKER,
        },
      });
      _injectContext(req, res);
      await requestHandler(req, res, next);

      expect(res._getStatusCode()).toBe(500);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe(JSON.stringify({
        // it('still performs all the checks')
        success: true,
        boom: false,
      }));
    });

    it('fails on timeout', async () => {
      telemetryMock.expects('error').once().withArgs(
        'requestHandler: failure',
        sinonMatcher({
          error: {
            code: 'ETIMEDOUT',
          },
          key: 'success',
        })
      );

      const requestHandler = createHealthCheckRequestHandler({
        checkers: {
          success: GOOD.healthChecker,
        },
        timeoutMs: 1000,
      });
      _injectContext(req, res);
      const promise = requestHandler(req, res, next);
      fakeTimers.tick(1500);
      await promise;

      expect(res._getStatusCode()).toBe(500);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe(JSON.stringify({
        success: false,
      }));
    });


    it('expects a Context in the Request', async () => {
      // it('hands the Error up the middleware chain')
      next.once().withArgs( sinonMatcher(Error) );

      const requestHandler = createHealthCheckRequestHandler(NO_CHECKERS);
      // no _injectContext
      await requestHandler(req, res, next);
    });

    it('succeeds with no checkers', async () => {
      const requestHandler = createHealthCheckRequestHandler(NO_CHECKERS);
      _injectContext(req, res);
      await requestHandler(req, res, next);

      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe('{}');
    });

    it('responds with a custom status code upon success', async () => {
      const requestHandler = createHealthCheckRequestHandler({
        checkers: {},
        successStatusCode: 302,
      });
      _injectContext(req, res);
      await requestHandler(req, res, next);

      expect(res._getStatusCode()).toBe(302);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe('{}');
    });

    it('responds with a custom status code upon failure', async () => {
      const requestHandler = createHealthCheckRequestHandler({
        checkers: {
          bad: BAD.healthChecker,
        },
        failureStatusCode: 418,
      });
      _injectContext(req, res);
      await requestHandler(req, res, next);

      expect(res._getStatusCode()).toBe(418);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      expect(res._getData()).toBe(JSON.stringify({
        bad: false,
      }));
    });

    it('does not let non-critical checks fail the aggregate', async () => {
      // it('logs the Error')
      telemetryMock.expects('error').once();

      const requestHandler = createHealthCheckRequestHandler({
        checkers: {
          success: GOOD.healthChecker,
          bad: BAD.healthChecker,
          boom: BOOM_CHECKER,
        },
        nonCritical: [ 'bad', 'boom' ],
      });
      _injectContext(req, res);
      await requestHandler(req, res, next);

      // it('sure seems happy')
      expect(res._getStatusCode()).toBe(200);
      expect(res._getHeaders()).toMatchObject({
        'content-type': 'application/json',
      })
      // it('is, in fact, quite unhappy')
      expect(res._getData()).toBe(JSON.stringify({
        success: true,
        bad: false,
        boom: false,
      }));
    });
  });
});
