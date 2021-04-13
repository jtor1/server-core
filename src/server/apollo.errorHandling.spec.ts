import * as TypeMoq from 'typemoq';
import { createRequest, createResponse } from 'node-mocks-http';
import { noop, omit } from 'lodash';
import {
  GraphQLRequestContext,
  GraphQLRequestListener,
} from 'apollo-server-plugin-base';
import { Request, Response, ErrorRequestHandler } from 'express';
import { Telemetry } from '@withjoy/telemetry';

import { Context } from '../server/apollo.context';
import {
  ApolloErrorPipeline,
} from './apollo.errorHandling';


// i can't tell you how hard it is to do basic shit with TypeMoq
type CalledErrorRequestHandler = ErrorRequestHandler & {
  callCount: number;
};
function _errorRequestHandler(fake: ErrorRequestHandler): CalledErrorRequestHandler {
  const handler: CalledErrorRequestHandler = async (...args) => {
    handler.callCount += 1;
    await fake(...args);
  };
  handler.callCount = 0;
  return handler;
}

const BOOM = Object.assign(new Error('BOOM'), {
  code: 'INTERNAL_SERVER_ERROR',
  stack: 'STACK', // for reproducibility
});
const KRAK = Object.assign(new Error('KRAK'), {
  code: 'I_AM_A_TEAPOT',
  stack: 'STACK',
});
const EMPTY_OBJECT = Object.freeze({});


describe('middleware/error.logging', () => {
  let pipeline: ApolloErrorPipeline;
  let req: Request;
  let res: Response;
  let context: Context;
  let telemetryMock: TypeMoq.IMock<Telemetry>;
  let telemetryError: Function;

  beforeEach(() => {
    pipeline = new ApolloErrorPipeline(EMPTY_OBJECT);
    res = createResponse<Response>();
    req = createRequest<Request>({ res });
    context = new Context({ req });

    telemetryMock = TypeMoq.Mock.ofType(Telemetry);

    // guess what framework doesn't support stubbing of a shared singleton?
    //   if you guessed `typemoq`, YOU ARE CORRECT !!!
    //   fortunately, there's very little surface exposure
    telemetryError = Telemetry.prototype.error;
    Telemetry.prototype.error = telemetryMock.object.error.bind(telemetryMock.object);
  });

  afterEach(() => {
    telemetryMock.verifyAll();

    // restore un-mocked version
    Reflect.set(Telemetry.prototype, 'error', telemetryError);
  });


  describe('#logEnrichedError', () => {
    let enrichedError: any;

    it('logs an enriched Error', () => {
      enrichedError = {
        message: 'BOOM',
        name: 'ENRICHED_ERROR',
        locations: [
          {
            line: 23,
            column: 5,
          },
        ],
        path: [
          'boom'
        ],
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
          exception: {
            stacktrace: [
              'Error: BOOM',
              '    STACK',
            ],
          },
        },
      };

      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', {
        source: 'apollo',
        action: 'error',
        error: {
          message: 'BOOM',
          name: 'ENRICHED_ERROR',
          code: 'INTERNAL_SERVER_ERROR',
          stack: 'Error: BOOM\n    STACK',
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      const returned = pipeline.logEnrichedError(enrichedError, context);
      expect(returned).toBe(enrichedError);
    });

    it('logs a plain old Error', () => {
      enrichedError = BOOM;

      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', {
        source: 'apollo',
        action: 'error',
        error: {
          message: 'BOOM',
          name: 'Error',
          code: 'INTERNAL_SERVER_ERROR',
          stack: 'STACK',
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      const returned = pipeline.logEnrichedError(enrichedError, context);
      expect(returned).toBe(enrichedError);
    });

    it('logs an unexpected Object', () => {
      enrichedError = Object.create(null);

      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', {
        source: 'apollo',
        action: 'error',
        error: {
          message: undefined,
          name: undefined,
          code: undefined,
          stack: undefined,
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      const returned = pipeline.logEnrichedError(enrichedError, context);
      expect(returned).toBe(enrichedError);
    });

    it('does no handling without an Error', () => {
      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.never());

      const returned = pipeline.logEnrichedError(null, context);
      expect(returned).toBe(null);
    });
  });


  describe('#process', () => {
    beforeEach(() => {
      // it('will always log the Error')
      // it('will only log it once')
      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
        source: 'apollo',
        action: 'error',
        error: {
          message: 'BOOM',
          name: 'Error',
          code: 'INTERNAL_SERVER_ERROR',
          stack: 'STACK',
        },
      })))
      .verifiable(TypeMoq.Times.exactly(1));
    });

    it('invokes an ErrorRequestHandler', async () => {
      const handler = _errorRequestHandler(async (err, _req, _res, next) => {
        expect(err).toBe(BOOM);
        expect(_req).toBe(req);
        expect(_res).toBe(res);

        next(err);
      });

      pipeline = new ApolloErrorPipeline({
        errorRequestHandlers: [ handler ],
      });

      const error = await pipeline.process(BOOM, context);
      expect(error).toBe(BOOM);

      expect(handler.callCount).toBe(1);
    });

    it('invokes a chain of ErrorRequestHandlers', async () => {
      const handlers = [
        // it('invokes them sequentially, propagating the resolved NextFunction value')
        _errorRequestHandler(async (err, _req, _res, next) => {
          next(KRAK);
        }),
        _errorRequestHandler(async (err, _req, _res, next) => {
          next(err);
        }),
      ];

      pipeline = new ApolloErrorPipeline({
        errorRequestHandlers: handlers,
      });

      const error = await pipeline.process(BOOM, context);
      expect(error).toBe(KRAK);

      expect(handlers.every((handler) => Boolean(handler.callCount))).toBe(true);
    });

    it('awaits the invocation of each NextFunction before proceeding', async () => {
      const DELAY = 500;
      const timeAtStart = Date.now();
      const handler = _errorRequestHandler(async (err, _req, _res, next) => {
        await new Promise((resolve) => setTimeout(resolve, DELAY));

        next(); // <= undefined; treated as `null`
      });

      pipeline = new ApolloErrorPipeline({
        errorRequestHandlers: [ handler ],
      });

      const error = await pipeline.process(BOOM, context);
      expect(error).toBeNull();

      expect(handler.callCount).toBe(1);
      expect(Date.now() - timeAtStart).toBeGreaterThanOrEqual(DELAY);
    });

    it('invokes no ErrorRequestHandlers', async () => {
      expect(pipeline.options.errorRequestHandlers).toBeUndefined();

      const error = await pipeline.process(BOOM, context);
      expect(error).toBe(BOOM);
    });
  });


  describe('#listener', () => {
    describe('#didEncounterErrors', () => {
      let didEncounterErrors: Function;

      beforeEach(() => {
        didEncounterErrors = pipeline.listener.didEncounterErrors!;
      });

      it('will do nothing without at least one Error', async () => {
        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
        .verifiable(TypeMoq.Times.never());

        await didEncounterErrors(<unknown>{
          context,
        } as GraphQLRequestContext);
      });

      it('logs Errors', async () => {
        const ERRORS = [ BOOM ];

        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
          source: 'apollo',
          action: 'error',
          error: {
            message: 'BOOM',
            name: 'Error',
            code: 'INTERNAL_SERVER_ERROR',
            stack: 'STACK',
          },
        })))
        .verifiable(TypeMoq.Times.exactly(1));

        await didEncounterErrors(<unknown>{
          context,
          errors: ERRORS,
        } as GraphQLRequestContext);
      });

      it('logs enriched Errors', async () => {
        // Context#telemetry can also log plain old Errors

        const ENRICHED_ERRORS = [
          {
            message: 'BOOM',
            name: 'Error',
            extensions: {
              code: 'INTERNAL_SERVER_ERROR',
              exception: {
                stacktrace: [
                  'Error: BOOM',
                  '    STACK',
                ],
              },
            },
          },
        ];

        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
          source: 'apollo',
          action: 'error',
          error: {
            message: 'BOOM',
            name: 'Error',
            code: 'INTERNAL_SERVER_ERROR',
            stack: 'Error: BOOM\n    STACK',
          },
        })))
        .verifiable(TypeMoq.Times.exactly(1));

        await didEncounterErrors(<unknown>{
          context,
          errors: ENRICHED_ERRORS,
        } as GraphQLRequestContext);
      });

      it('invokes #process on each Error', async () => {
        const ERRORS = [ BOOM, KRAK ];

        // it('will always log the Error')
        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
          source: 'apollo',
          action: 'error',
          error: {
            message: 'BOOM',
            name: 'Error',
            code: 'INTERNAL_SERVER_ERROR',
            stack: 'STACK',
          },
        })))
        .verifiable(TypeMoq.Times.exactly(1));

        // ... in this case, both of them
        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
          source: 'apollo',
          action: 'error',
          error: {
            message: 'KRAK',
            name: 'Error',
            code: 'I_AM_A_TEAPOT',
            stack: 'STACK',
          },
        })))
        .verifiable(TypeMoq.Times.exactly(1));

        // a Pipeline with at least one ErrorRequestHandler
        const handler = _errorRequestHandler(async (err, _req, _res, next) => {
          next(err);
        });

        pipeline = new ApolloErrorPipeline({
          errorRequestHandlers: [ handler ],
        });
        didEncounterErrors = pipeline.listener.didEncounterErrors!;

        await didEncounterErrors(<unknown>{
          context,
          errors: ERRORS,
        } as GraphQLRequestContext);

        // it('calls the ErrorRequestHandler with each Error')
        expect(handler.callCount).toBe(2);
      });
    });
  });


  describe('#plugin', () => {
    describe('#requestDidStart', () => {
      it('exposes a #listener', () => {
        const plugin = pipeline.plugin;
        const listener = plugin.requestDidStart!(<unknown>{
          context,
        } as GraphQLRequestContext);

        expect(listener).toBeDefined();
        expect((listener as GraphQLRequestListener).didEncounterErrors).toBeInstanceOf(Function);
      });
    });
  });
});
