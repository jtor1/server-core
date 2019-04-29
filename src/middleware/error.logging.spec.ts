import 'jest';
import * as TypeMoq from 'typemoq';
import { createRequest, createResponse, Headers } from 'node-mocks-http';
import { Request, Response, NextFunction } from 'express';
import { Console } from 'console';
import { GraphQLError } from 'graphql';

import {
  errorLoggingExpress,
  errorFormattingApollo,
} from './error.logging';


describe('error.logging', () => {
  let consoleMock: TypeMoq.IGlobalMock<Console>;

  beforeEach(() => {
    consoleMock = TypeMoq.GlobalMock.ofInstance<Console>(console, 'console', global);
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
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        errorLoggingExpress(err, req, res, nextMock.object);
      });

      consoleMock.verify(
        (mocked) => mocked.error(JSON.stringify({
          error: {
            message: 'BOOM',
            name: 'Error',
            stack: 'STACK',
          },
          request: {
            path: '/path',
            params: { params: true },
            query: { query: true },
            body: { body: true },
          },
        })),
        TypeMoq.Times.exactly(1)
      );
    });

    it('responds with an Error', () => {
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        errorLoggingExpress(err, req, res, nextMock.object);
      });

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
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        errorLoggingExpress(err, req, res, nextMock.object);
      });

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.never()
      );
    });


    it('does no handling without an Error', () => {
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        errorLoggingExpress((null as unknown), req, res, nextMock.object);
      });

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.exactly(1)
      );

      consoleMock.verify(
        (mocked) => mocked.error(TypeMoq.It.isAnyString()),
        TypeMoq.Times.never()
      );

      expect(res.headersSent).toBe(false);
    });

    it('respects additional Error properties, when available', () => {
      err.name = 'ForbiddenError';
      (err as any).statusCode = 403;
      (err as any).code = 'FORBIDDEN_ERROR';

      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        errorLoggingExpress(err, req, res, nextMock.object);
      });

      consoleMock.verify(
        (mocked) => mocked.error(JSON.stringify({
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
        })),
        TypeMoq.Times.exactly(1)
      );

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

      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        errorLoggingExpress(err, req, res, nextMock.object);
      });

      consoleMock.verify(
        (mocked) => mocked.error(JSON.stringify({
          error: {
            message: 'BOOM',
            name: 'Error',
            stack: 'STACK',
          },
          request: {
            path: '/path',
            params: { params: true },
            query: { query: true },
            body: { body: true },
          },
        })),
        TypeMoq.Times.exactly(1)
      );
    });
  });


  describe('errorFormattingApollo', () => {
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

      let returned;
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        returned = errorFormattingApollo(enrichedError);
      });

      consoleMock.verify(
        (mocked) => mocked.error(JSON.stringify({
          error: {
            message: 'BOOM',
            name: 'ENRICHED_ERROR',
            code: 'INTERNAL_SERVER_ERROR',
            stack: 'Error: BOOM\n    STACK',
          },
        })),
        TypeMoq.Times.exactly(1)
      );

      expect(returned).toBe(enrichedError);
    });

    it('logs an unexpected Object', () => {
      enrichedError = Object.create(null);

      let returned;
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        returned = errorFormattingApollo(enrichedError);
      });

      consoleMock.verify(
        (mocked) => mocked.error(JSON.stringify({
          error: {},
        })),
        TypeMoq.Times.exactly(1)
      );

      expect(returned).toBe(enrichedError);
    });

    it('does no handling without an Error', () => {
      let returned;
      TypeMoq.GlobalScope.using(consoleMock).with(() => {
        returned = errorFormattingApollo(null);
      });

      consoleMock.verify(
        (mocked) => mocked.error(TypeMoq.It.isAnyString()),
        TypeMoq.Times.never()
      );

      expect(returned).toBe(null);
    });
  });
});
