import * as TypeMoq from 'typemoq';
import { createRequest, createResponse, Headers } from 'node-mocks-http';
import { Request, Response, NextFunction } from 'express';
import { telemetry, Telemetry } from '@withjoy/telemetry';

import {
  errorLoggingExpress,
} from './error.logging';


describe('middleware/error.logging', () => {
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
          params: JSON.stringify({ params: true }),
          query: JSON.stringify({ query: true }),
          body: JSON.stringify({ body: true }),
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);
    });

    it('logs an Error for a sparse request', () => {
      req = createRequest({
        path: '/path',
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
          params: JSON.stringify({ params: true }),
          query: JSON.stringify({ query: true }),
          body: JSON.stringify({ body: true }),
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
          params: JSON.stringify({ params: true }),
          query: JSON.stringify({ query: true }),
          body: JSON.stringify({ body: true }),
        },
      }))
      .verifiable(TypeMoq.Times.exactly(1));

      errorLoggingExpress(err, req, res, nextMock.object);
    });
  });
});
