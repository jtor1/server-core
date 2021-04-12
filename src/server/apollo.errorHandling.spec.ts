import * as TypeMoq from 'typemoq';
import { noop, omit } from 'lodash';
import { Telemetry } from '@withjoy/telemetry';

import { Context } from '../server/apollo.context';
import {
  _logApolloEnrichedError,
  _errorLoggingApolloListener,
  _errorLoggingApolloPlugin,
} from './apollo.errorHandling';


describe('middleware/error.logging', () => {
  let telemetryMock: TypeMoq.IMock<Telemetry>;
  let telemetryError: Function;

  beforeEach(() => {
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


  describe('_logApolloEnrichedError', () => {
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

      const returned = _logApolloEnrichedError(enrichedError, telemetryMock.object);
      expect(returned).toBe(enrichedError);
    });

    it('logs a plain old Error', () => {
      enrichedError = new Error('BOOM');
      (enrichedError as any).code = 'INTERNAL_SERVER_ERROR';
      enrichedError.stack = 'STACK'; // for reproducibility

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

      const returned = _logApolloEnrichedError(enrichedError, telemetryMock.object);
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

      const returned = _logApolloEnrichedError(enrichedError, telemetryMock.object);
      expect(returned).toBe(enrichedError);
    });

    it('does no handling without an Error', () => {
      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.never());

      const returned = _logApolloEnrichedError(null, telemetryMock.object);
      expect(returned).toBe(null);
    });
  });


  describe('_errorLoggingApolloListener', () => {
    describe('#didEncounterErrors', () => {
      const didEncounterErrors = _errorLoggingApolloListener.didEncounterErrors!;
      let contextTelemetryMock: TypeMoq.IMock<Telemetry>;
      let context: Context;

      beforeEach(() => {
        context = new Context();

        // a distinct Telemetry discoverable from the Context
        //   with the assumption that it benefits from custom Telemetry context
        //   derived from Request headers
        contextTelemetryMock = TypeMoq.Mock.ofInstance(context.telemetry);
        Reflect.set(context, 'telemetry', contextTelemetryMock.object);
      });

      afterEach(() => {
        contextTelemetryMock.verifyAll();
      });


      it('expects Errors', () => {
        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
        .verifiable(TypeMoq.Times.never());

        contextTelemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
        .verifiable(TypeMoq.Times.never());

        didEncounterErrors(<any>{
          context,
        });
      });

      it('logs Errors with the global Telemetry singleton', () => {
        // the global Telemetry singleton can also log enriched Errors

        const ERRORS = [
          Object.assign(new Error('BOOM'), {
            code: 'INTERNAL_SERVER_ERROR',
            stack: 'STACK',
          }),
        ];

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

        contextTelemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
        .verifiable(TypeMoq.Times.never());

        didEncounterErrors(<any>{
          context: omit(context, 'telemetry'),
          errors: ERRORS,
        });
      });

      it('logs enriched Errors with Context#telemetry', () => {
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

        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
        .verifiable(TypeMoq.Times.never());

        contextTelemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
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

        didEncounterErrors(<any>{
          context,
          errors: ENRICHED_ERRORS,
        });
      });
    });
  });


  describe('_errorLoggingApolloPlugin', () => {
    it('is a simple helper for the Apollo request pipeline', noop);
  });
});
