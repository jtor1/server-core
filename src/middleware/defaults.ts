import { get as getProperty, isString } from 'lodash';
import { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { TokenIndexer } from 'morgan';
import bodyParser from 'body-parser';
import { parse as urlParse } from 'url';
import {
  telemetry as telemetryGlobal,
  TelemetryLevel
} from '@withjoy/telemetry';

import { bodyParserGraphql } from './body.parser';
import { sessionMiddleware } from './session';

interface DefaultMiddlewareResult {
  preludesMap: Map<string, RequestHandler>;
  preludes: RequestHandler[];
  bodyParsersMap: Map<string, RequestHandler>;
  bodyParsers: RequestHandler[];
  apolloMap: Map<string, RequestHandler>;
  apollo: RequestHandler[];
};


function _tupleByMiddlewareName(handler: RequestHandler): [ string, RequestHandler ] {
  // keyed by the names Express would give them
  return [ handler.name, handler ];
}

// @protected -- exported only for Test Suite, not '/index.ts'
export function _morganFormatter(tokens: TokenIndexer, req: Request, res: Response): string | null {
  const url = tokens.url(req, res);
  if (url.startsWith('/healthy')) {
    // health checks should not spam the logs
    return null;
  }

  // align `morgan` + Telemetry logging
  // there's a Telemetry instance tied to every Context
  //   (1) Context => `req.context` is associated by Apollo during their Server's `context` callback
  //   (2) a `Context#telemetry` instance is setup by the Context Constructor
  // ... assuming that the Request has been associated with a Context
  //   which cannot be guaranteed,
  //   so fall back to the Telemetry singleton if need be
  const contextTelemetry = getProperty(req, 'context.telemetry') || telemetryGlobal;
  if (contextTelemetry.isLogSilent()) {
    // Telemetry logging has been silenced
    return null;
  }

  const xForwardedFor = tokens.req(req, res, 'x-forwarded-for');
  const remoteAddress = xForwardedFor || tokens['remote-addr'](req, res);
  const loggedData = {
    source: 'express',
    action: 'request',

    // inbound
    remoteAddress,
    host: tokens.req(req, res, 'host'),
    method: tokens.method(req, res),
    url,

    // outbound (because { immediate: false })
    statusCode: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTimeMs: tokens['response-time'](req, res),
  };

  // with Telemetry, at 'info' level
  const telemetryData = contextTelemetry.getLoggedData(TelemetryLevel.info, loggedData);
  return JSON.stringify(telemetryData);
}
const MORGAN_LOGGER = morgan(_morganFormatter, {
  immediate: false,
  stream: process.stdout, // vs. @withjoy/telemetry, because Stream
});


const WITHJOY_DOMAIN_REGEX = /.withjoy.com$/;

export function getDefaultMiddleware(): DefaultMiddlewareResult {
  const preludesMap = new Map<string, RequestHandler>([
    cors({
      origin: function(originProvided, callback) {
        // // FIXME:  the right thing to do
        // //   however ... all Dev would need to be done from '*.withjoy.com' via /etc/hosts
        // //   let's not bite that off just yet
        // try {
        //   const { hostname } = urlParse(originProvided);
        //   const matches = (hostname && WITHJOY_DOMAIN_REGEX.test(hostname)) || false;
        //   callback(null, matches);
        // }
        // catch (err) {
        //   callback(null, false);
        // }

        // https://github.com/expressjs/cors#configuration-options
        //   a String is an acceptable callback value, TypeScript be damned
        const originAllowed: any = (isString(originProvided) ? originProvided : '*');
        callback(null, originAllowed);
      },

      // required for Cookie support
      credentials: true,
    }),
    MORGAN_LOGGER,
  ].map(_tupleByMiddlewareName));

  const bodyParsersMap = new Map<string, RequestHandler>([
    // calling out the default(s) -- @see https://github.com/expressjs/body-parser#bodyparserjsonoptions
    bodyParser.json({ limit: '100Kb' }),
    bodyParser.urlencoded({ extended: false }),
  ].map(_tupleByMiddlewareName));

  const apolloMap = new Map<string, RequestHandler>([
    sessionMiddleware(),
    bodyParserGraphql({ limit: '100Kb' }),
  ].map(_tupleByMiddlewareName));

  return {
    preludesMap,
    get preludes() { return Array.from(preludesMap.values()); },
    bodyParsersMap,
    get bodyParsers() { return Array.from(bodyParsersMap.values()); },
    apolloMap,
    get apollo() { return Array.from(apolloMap.values()); },
  };
}
