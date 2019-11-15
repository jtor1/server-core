import 'jest';
import * as TypeMoq from 'typemoq';
import { noop, omit } from 'lodash';
import { createRequest, createResponse, Headers } from 'node-mocks-http';
import { Request, Response, NextFunction } from 'express';
import { GraphQLError } from 'graphql';
import { telemetry, Telemetry } from '@withjoy/telemetry';

import { Context } from '../server/apollo.context';
import {
  errorLoggingExpress,
  logApolloEnrichedError,
  errorLoggingApolloListener,
  errorLoggingApolloPlugin,
} from './error.logging';


describe('error.logging', () => {
  let telemetryMock: TypeMoq.IMock<Telemetry>;
  let telemetryError: Function;

  beforeEach(() => {
    telemetryMock = TypeMoq.Mock.ofType(Telemetry);

    // guess what framework doesn't support stubbing of a shared singleton?
    //   if you guessed `typemoq`, YOU ARE CORRECT !!!
    //   fortunately, there's very little surface exposure
    telemetryError = telemetry.error;
    telemetry.error = telemetryMock.object.error.bind(telemetryMock.object);
  });

  afterEach(() => {
    telemetryMock.verifyAll();

    Reflect.set(telemetry, 'error', telemetryError);
  });


  describe('errorLoggingExpress', () => {
    let err: Error;
    let req: Request;
    let res: Response;
    let nextMock: TypeMoq.IMock<NextFunction>;

    beforeEach(() => {
      err = new Error('BOOM');
      err.stack = 'STACK'; // for reproducibility

      req = createRequest({
        path: '/path',
        params: { params: true },
        query: { query: true },
        body: { body: true },
      });
      res = createResponse();
      nextMock = TypeMoq.Mock.ofType<NextFunction>();
    });


    it('logs an Error', () => {
      telemetryMock.setup((mocked) => mocked.error('errorLoggingExpress', {
        source: 'express',
        action: 'error',
        error: {
          message: 'BOOM',
          name: 'Error',
          stack: 'STACK',
          statusCode: undefined,
          code: undefined,
        },
        request: {
          path: '/path',
          params: { params: true },
          query: { query: true },
          body: { body: true },
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);
    });

    it('responds with an Error', () => {
      telemetryMock.setup((mocked) => mocked.error('errorLoggingExpress', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);

      expect(res.headersSent).toBe(true);
      expect((res as any)._getStatusCode()).toBe(500);
      expect((res as any)._isJSON()).toEqual(true);
      expect(JSON.parse((res as any)._getData())).toMatchObject({
        error: {
          message: 'BOOM',
          name: 'Error',
        },
      });
    });

    it('handles the Error', () => {
      telemetryMock.setup((mocked) => mocked.error('errorLoggingExpress', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.never()
      );
    });


    it('does no handling without an Error', () => {
      telemetryMock.setup((mocked) => mocked.error('errorLoggingExpress', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.never());

      errorLoggingExpress((null as unknown), req, res, nextMock.object);

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.exactly(1)
      );

      expect(res.headersSent).toBe(false);
    });

    it('respects additional Error properties, when available', () => {
      err.name = 'ForbiddenError';
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN_ERROR';

      telemetryMock.setup((mocked) => mocked.error('errorLoggingExpress', {
        source: 'express',
        action: 'error',
        error: {
          message: 'BOOM',
          name: 'ForbiddenError',
          code: 'FORBIDDEN_ERROR',
          statusCode: 403,
          stack: 'STACK',
        },
        request: {
          path: '/path',
          params: { params: true },
          query: { query: true },
          body: { body: true },
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);

      expect(res.headersSent).toBe(true);
      expect((res as any)._getStatusCode()).toBe(403);
      expect((res as any)._isJSON()).toEqual(true);
      expect(JSON.parse((res as any)._getData())).toMatchObject({
        error: {
          message: 'BOOM',
          name: 'ForbiddenError',
          code: 'FORBIDDEN_ERROR',
          statusCode: 403,
        },
      });
    });

    it('is very selective about Request properties', () => {
      req = createRequest({
        protocol: 'IGNORED',
        host: 'IGNORED',
        hostname: 'IGNORED',
        headers: ({ ignored: 'yes' } as Headers),

        path: '/path',
        params: { params: true },
        query: { query: true },
        body: { body: true },
      });

      telemetryMock.setup((mocked) => mocked.error('errorLoggingExpress', {
        source: 'express',
        action: 'error',
        error: {
          message: 'BOOM',
          name: 'Error',
          stack: 'STACK',
          statusCode: undefined,
          code: undefined,
        },
        request: {
          path: '/path',
          params: { params: true },
          query: { query: true },
          body: { body: true },
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);
    });
  });


  describe('logApolloEnrichedError', () => {
    let enrichedError: any;

    it('logs an Error', () => {
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
      }

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

      const returned = logApolloEnrichedError(enrichedError, telemetryMock.object);
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

      const returned = logApolloEnrichedError(enrichedError, telemetryMock.object);
      expect(returned).toBe(enrichedError);
    });

    it('does no handling without an Error', () => {
      telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
      .verifiable(TypeMoq.Times.never());

      const returned = logApolloEnrichedError(null, telemetryMock.object);
      expect(returned).toBe(null);
    });
  });


  describe('errorLoggingApolloListener', () => {
    describe('#didEncounterErrors', () => {
      const ERRORS = [ new Error('BOOM') ];
      const didEncounterErrors = errorLoggingApolloListener.didEncounterErrors!;
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
        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
          source: 'apollo',
          action: 'error',
          error: {
            message: 'BOOM',
            name: 'Error',
            code: undefined,
            stack: undefined,
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

      it('logs Errors with Context#telemetry', () => {
        telemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({})))
        .verifiable(TypeMoq.Times.never());

        contextTelemetryMock.setup((mocked) => mocked.error('logApolloEnrichedError', TypeMoq.It.isObjectWith({
          source: 'apollo',
          action: 'error',
          error: {
            message: 'BOOM',
            name: 'Error',
            code: undefined,
            stack: undefined,
          },
        })))
        .verifiable(TypeMoq.Times.exactly(1));

        didEncounterErrors(<any>{
          context,
          errors: ERRORS,
        });
      });
    });
  });


  describe('errorLoggingApolloPlugin', () => {
    it('is a simple helper for the Apollo request pipeline', noop);
  });
});
