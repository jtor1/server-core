import { Socket } from 'net';
import { noop, omit } from 'lodash';
import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express'
import { createRequest, createResponse } from 'node-mocks-http';
import morgan from 'morgan';
import {
  TELEMETRY_HEADER_REQUEST_ID,

  telemetry,
  configureGlobalTelemetry,
  contextualizeGlobalTelemetry,
} from '@withjoy/telemetry';

import { Context, injectContextIntoRequestMiddleware } from '../server/apollo.context';
import { NO_USER, NO_TOKEN } from '../authentication/token.check';
import { RequestHandlerVariant } from '../middleware/types';
import { SESSION_REQUEST_PROPERTY } from '../middleware/session';
import {
  getDefaultMiddleware,

  // @protected
  _morganFormatter,
} from './defaults';


// just to prove that `RequestHandlerVariant` does its job
const _requestHandler: RequestHandler = function(req: Request, res: Response, next: NextFunction) {
  next();
}
const _errorRequestHandler: ErrorRequestHandler = function(err: Error, req: Request, res: Response, next: NextFunction) {
  next(err);
}

const SESSION_ID = 'SESSION_ID';


describe('middleware/defaults', () => {
  describe('getDefaultMiddleware', () => {
    const PRELUDE_KEYS = [
      'corsMiddleware',
      'sessionMiddleware',
      'logger',
    ];
    const BODY_PARSER_KEYS = [
      'jsonParser',
      'urlencodedParser',
    ];
    const APOLLO_KEYS = [
      'bodyParserGraphql',
    ];

    it('returns "prelude" middleware', () => {
      const { preludesMap, preludes } = getDefaultMiddleware();

      expect(Array.from(preludesMap.keys())).toEqual(PRELUDE_KEYS);

      // it('preserves the order of the mapping')
      expect( preludes.map((handler) => handler.name) ).toEqual(PRELUDE_KEYS);
    });

    it('returns `body-parser` middleware', () => {
      const { bodyParsersMap, bodyParsers } = getDefaultMiddleware();

      expect(Array.from(bodyParsersMap.keys())).toEqual(BODY_PARSER_KEYS);

      // it('preserves the order of the mapping')
      expect( bodyParsers.map((handler) => handler.name) ).toEqual(BODY_PARSER_KEYS);
    });

    it('returns Apollo-specific middleware', () => {
      const { apolloMap, apollo } = getDefaultMiddleware();

      expect(Array.from(apolloMap.keys())).toEqual(APOLLO_KEYS);

      // it('preserves the order of the mapping')
      expect( apollo.map((handler) => handler.name) ).toEqual(APOLLO_KEYS);
    });

    it('supports RequestHandler variants', () => {
      const middleware = getDefaultMiddleware();
      const { preludesMap, bodyParsersMap, apolloMap } = middleware;

      preludesMap.set('req', _requestHandler);
      preludesMap.set('err', _errorRequestHandler);
      expect(Array.from(preludesMap.keys())).toEqual([ ...PRELUDE_KEYS, 'req', 'err' ]);

      bodyParsersMap.set('req', _requestHandler);
      bodyParsersMap.set('err', _errorRequestHandler);
      expect(Array.from(bodyParsersMap.keys())).toEqual([ ...BODY_PARSER_KEYS, 'req', 'err' ]);

      apolloMap.set('req', _requestHandler);
      apolloMap.set('err', _errorRequestHandler);
      expect(Array.from(apolloMap.keys())).toEqual([ ...APOLLO_KEYS, 'req', 'err' ]);
    });
  });


  describe('_morganLogger', () => {
    const LOGGED_BY_GLOBAL_TELEMETRY = Object.freeze({
      app: 'HOSTNAME APP',
      hostname: 'HOSTNAME',
      level: 30, // TelemetryLevel.info
      service: 'APP',
      // avoid time-sensitive properties
      //   time
      //   unixTime
    });
    const LOGGED_BY_CONTEXT_TELEMETRY = Object.freeze({
      ...LOGGED_BY_GLOBAL_TELEMETRY,

      req: { // @see introspection setup by Context#constructor
        sessionId: SESSION_ID,
        jwt: null,
        token: NO_TOKEN,
        userId: NO_USER,
      },
    });
    let req: Request;
    let res: Response;
    let telemetryContext: Record<string, any>;

    beforeEach(() => {
      telemetryContext = telemetry.context();

      contextualizeGlobalTelemetry({
        // @see LOGGED_BY_GLOBAL_TELEMETRY
        app: 'APP',
        hostname: 'HOSTNAME',
      });
    });
    afterEach(() => {
      // restore prior Telemetry context
      contextualizeGlobalTelemetry(telemetryContext);
    });

    it('logs maximal data with a context', () => {
      req = createRequest({
        method: 'PATCH',
        ip: 'ADDRESS_IP',
        url: '/url',
        headers: {
          'host': 'HOST',
          'x-forwarded-for': 'IGNORED',

          // => Telemetry `{ requestId }`
          [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
        },

        [ SESSION_REQUEST_PROPERTY ]: SESSION_ID, // pre-derived (vs. Cookie / header)
      });

      // internal `morgan` trickery
      //   `process.hrtime` => [ seconds, nanos ]
      Reflect.set(req, '_startAt', [ 0, 0 ]);

      res = createResponse();
      res.set('content-length', '23');
      res.send(418);
      Reflect.set(res, '_startAt', [ 5, 860000 ]);

      // build a Request <=> Context relationship
      const middleware = injectContextIntoRequestMiddleware((args) => new Context(args));
      middleware(req, res, noop);
      const context = (<any>req).context;
      expect(context.telemetry).toBeDefined();
      Reflect.set(context, 'remoteAddress', 'ADDRESS_FORWARDED');

      const formatted = _morganFormatter(<any>morgan, req, res);
      const parsed = JSON.parse(formatted!); // from a formatted String
      const expected = omit(parsed, 'time', 'unixTime'); // avoid time-sensitive properties

      expect(expected).toEqual({
        // it('logs with Telemetry from the Context')
        ...LOGGED_BY_CONTEXT_TELEMETRY,

        // it('logs the Request ID header via Telemetry')
        requestId: 'REQUEST_ID',

        // it('logs the Session ID')
        sessionId: SESSION_ID,

        // it('derives the remote address from the Context')
        remoteAddress: 'ADDRESS_FORWARDED',

        source: 'express',
        action: 'request',
        host: 'HOST',
        method: 'PATCH',
        path: '/url',
        statusCode: '418',
        contentLength: '23',
        responseTimeMs: '5000.860',
      });
    });

    it('logs less data with a context', () => {
      req = createRequest({
        [ SESSION_REQUEST_PROPERTY ]: SESSION_ID, // pre-derived (vs. Cookie / header)

        connection: ({ remoteAddress: 'ADDRESS_IP' } as Socket), // ignored
      });

      res = createResponse();
      res.send(200);

      // build a Request <=> Context relationship
      const middleware = injectContextIntoRequestMiddleware((args) => new Context(args));
      middleware(req, res, noop);
      expect((<any>req).context.telemetry).toBeDefined();

      const formatted = _morganFormatter(<any>morgan, req, res);
      const parsed = JSON.parse(formatted!); // from a formatted String
      const expected = omit(parsed, 'time', 'unixTime'); // avoid time-sensitive properties

      expect(expected).toEqual({
        // it('logs with Telemetry from the Context')
        ...LOGGED_BY_CONTEXT_TELEMETRY,

        // it('logs the Session ID')
        sessionId: SESSION_ID,

        // it('disregards the Request ID in absence of a request header')

        // it('only derives `remoteAddress` from an "x-forwarded-for" header')

        source: 'express',
        action: 'request',
        requestId: expect.any(String),
        method: 'GET',
        path: '',
        statusCode: '200',
      });
    });

    it('logs maximal data without a context', () => {
      req = createRequest({
        method: 'PATCH',
        url: '/url',
        headers: {
          'host': 'HOST',
          'x-forwarded-for': 'ADDRESS_FORWARDED',
        },

        [ SESSION_REQUEST_PROPERTY ]: SESSION_ID, // pre-derived (vs. Cookie / header)
      });

      res = createResponse();
      res.send(200);

      expect((<any>req).context).toBeUndefined();

      const formatted = _morganFormatter(<any>morgan, req, res);
      const parsed = JSON.parse(formatted!); // from a formatted String
      const expected = omit(parsed, 'time', 'unixTime'); // avoid time-sensitive properties

      expect(expected).toEqual({
        // it('logs with global Telemetry')
        ...LOGGED_BY_GLOBAL_TELEMETRY,

        // it('logs the Session ID')
        sessionId: SESSION_ID,

        // it('logs the default Request ID via Telemetry in absence of a request header')
        requestId: '                                ',

        source: 'express',
        action: 'request',
        remoteAddress: 'ADDRESS_FORWARDED',
        host: 'HOST',
        method: 'PATCH',
        path: '/url',
        statusCode: '200',
      });
    });

    it('logs minimal data without a context', () => {
      req = createRequest();
      res = createResponse(); // un-sent

      expect((<any>req).context).toBeUndefined();

      const formatted = _morganFormatter(<any>morgan, req, res);
      const parsed = JSON.parse(formatted!); // from a formatted String
      const expected = omit(parsed, 'time', 'unixTime'); // avoid time-sensitive properties

      expect(expected).toEqual({
        // it('logs with global Telemetry')
        ...LOGGED_BY_GLOBAL_TELEMETRY,

        // it('logs the default Request ID via Telemetry in absence of a request header')
        requestId: '                                ',

        source: 'express',
        action: 'request',
        method: 'GET',
        path: '',
      });
    });

    it('does not log a health check', () => {
      req = createRequest({
        method: 'GET',
        url: '/healthy',
      });
      expect(Reflect.get(req, 'context')).toBeUndefined();

      res = createResponse();
      res.send(200);

      const formatted = _morganFormatter(<any>morgan, req, res);
      expect(formatted).toBeNull();
    });

    it('does not log when Telemetry has been silenced', () => {
      configureGlobalTelemetry({
        logSilent: true,
      });
      expect(telemetry.isLogSilent()).toBe(true);

      req = createRequest(); // no Request <=> Context relationship
      expect((<any>req).context).toBeUndefined();

      res = createResponse();
      res.send(200);

      const formatted = _morganFormatter(<any>morgan, req, res);
      expect(formatted).toBeNull();
    });
  });
});
