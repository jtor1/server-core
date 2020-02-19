import 'jest';

import { noop } from 'lodash';
import { Request, Response } from 'express'
import { createRequest, createResponse } from 'node-mocks-http';
import morgan from 'morgan';
import { Context, injectContextIntoRequestMiddleware } from '../server/apollo.context';
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
    let req: Request;
    let res: Response;

    it('logs rich data with a context', () => {
      req = createRequest({
        method: 'PATCH',
        ip: 'ADDRESS_IP',
        url: '/url',
        headers: {
          'host': 'HOST',
          'x-forwarded-for': 'ADDRESS_FORWARDED',
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

      const context = Reflect.get(req, 'context');
      expect(context).toBeDefined();
      context.telemetry.context().requestId = 'REQUEST_ID';

      const formatted = _morganFormatter(<any>morgan, req, res);
      expect(JSON.parse(formatted)).toEqual({
        source: 'express',
        action: 'request',
        requestId: 'REQUEST_ID',
        remoteAddress: 'ADDRESS_FORWARDED',
        host: 'HOST',
        method: 'PATCH',
        uri: '/url',
        statusCode: '418',
        contentLength: '23',
        responseTimeMs: '5000.860',
      });
    });

    it('logs minimal data', () => {
      req = createRequest({
        ip: 'ADDRESS_IP',
      });

      res = createResponse();
      res.send(200);

      // build a Request <=> Context relationship
      const middleware = injectContextIntoRequestMiddleware((args) => new Context(args));
      middleware(req, res, noop);

      const context = Reflect.get(req, 'context');
      expect(context).toBeDefined();

      const formatted = _morganFormatter(<any>morgan, req, res);
      expect(JSON.parse(formatted)).toEqual({
        source: 'express',
        action: 'request',
        requestId: expect.any(String),
        remoteAddress: 'ADDRESS_IP',
        method: 'GET',
        uri: '',
        statusCode: '200',
      });
    });
  });
});
