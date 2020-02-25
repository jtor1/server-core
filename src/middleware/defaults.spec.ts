import 'jest';
import { noop, omit } from 'lodash';
import { Request, Response } from 'express'
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
import {
  getDefaultMiddleware,

  // @protected
  _morganFormatter,
} from './defaults';


describe('middleware/defaults', () => {
  describe('getDefaultMiddleware', () => {
    it('returns "prelude" middleware', () => {
      const { preludesMap, preludes } = getDefaultMiddleware();

      const NAMES = [
        'corsMiddleware',
        'logger',
      ];
      expect(Array.from(preludesMap.keys())).toEqual(NAMES);

      // it('preserves the order of the mapping')
      expect( preludes.map((handler) => handler.name) ).toEqual(NAMES);
    });

    it('returns `body-parser` middleware', () => {
      const { bodyParsersMap, bodyParsers } = getDefaultMiddleware();

      const NAMES = [
        'jsonParser',
        'urlencodedParser',
      ];
      expect(Array.from(bodyParsersMap.keys())).toEqual(NAMES);

      // it('preserves the order of the mapping')
      expect( bodyParsers.map((handler) => handler.name) ).toEqual(NAMES);
    });

    it('returns Apollo-specific middleware', () => {
      const { apolloMap, apollo } = getDefaultMiddleware();

      const NAMES = [
        'bodyParserGraphql',
      ];
      expect(Array.from(apolloMap.keys())).toEqual(NAMES);

      // it('preserves the order of the mapping')
      expect( apollo.map((handler) => handler.name) ).toEqual(NAMES);
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
          'x-forwarded-for': 'ADDRESS_FORWARDED',

          // => Telemetry `{ requestId }`
          [ TELEMETRY_HEADER_REQUEST_ID ]: 'REQUEST_ID',
        },
      });
      Reflect.set(req, '_startAt', [ 0, 0 ]);

      res = createResponse();
      res.set('content-length', '23');
      res.send(418);
      Reflect.set(res, '_startAt', [ 5, 860000 ]); // `process.hrtime` => [ seconds, nanos ]

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

        // it('logs the Request ID header via Telemetry')
        requestId: 'REQUEST_ID',

        source: 'express',
        action: 'request',
        remoteAddress: 'ADDRESS_FORWARDED',
        host: 'HOST',
        method: 'PATCH',
        url: '/url',
        statusCode: '418',
        contentLength: '23',
        responseTimeMs: '5000.860',
      });
    });

    it('logs less data with a context', () => {
      req = createRequest({
        ip: 'ADDRESS_IP',
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

        // it('disregards the Request ID in absence of a request header')

        source: 'express',
        action: 'request',
        requestId: expect.any(String),
        remoteAddress: 'ADDRESS_IP',
        method: 'GET',
        url: '',
        statusCode: '200',
      });
    });

    it('logs minimal data', () => {
      req = createRequest(); // no Request <=> Context relationship
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
        url: '',
      });
    });

    it('does not log a health check', () => {
      req = createRequest({
        method: 'GET',
        url: '/healthy',
        ip: 'ADDRESS_IP',
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