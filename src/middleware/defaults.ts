import { get as getProperty, isString, last } from 'lodash';
import { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import forwarded from 'forwarded';
import {
  telemetry as telemetryGlobal,
  TelemetryLevel
} from '@withjoy/telemetry';

import { RequestHandlerVariant } from './types';
import { bodyParserGraphql } from './body.parser';
import { sessionMiddleware, SESSION_REQUEST_PROPERTY } from './session';

interface DefaultMiddlewareResult {
  preludesMap: Map<string, RequestHandlerVariant>;
  preludes: RequestHandlerVariant[];
  bodyParsersMap: Map<string, RequestHandlerVariant>;
  bodyParsers: RequestHandlerVariant[];
  apolloMap: Map<string, RequestHandlerVariant>;
  apollo: RequestHandlerVariant[];
};


function _tupleByMiddlewareName(handler: RequestHandlerVariant): [ string, RequestHandlerVariant ] {
  // keyed by the names Express would give them
  return [ handler.name, handler ];
}

// @protected -- exported only for Test Suite, not '/index.ts'
//
// NOTE: `tokens: any` because `morgan.TokenIndexer` is incompatible across Node 6 + 10
//   Node 6:  "Type 'TokenIndexer<Request, Response>' is not assignable to type 'TokenIndexer<IncomingMessage, ServerResponse>'."
//   Node 10:  "Argument of type 'IncomingMessage' is not assignable to parameter of type 'Request'."
//
export function _morganFormatter(tokens: any, req: Request, res: Response): string | null {
  const reqAsAny: any = req;

  const path = tokens.url(req, res);
  if (path && path.startsWith('/healthy')) {
    // health checks should not spam the logs
    return null;
  }

  // @see `injectContextIntoRequestMiddleware`
  const context = reqAsAny.context;

  // align `morgan` + Telemetry logging
  // there's a Telemetry instance tied to every Context
  //   (1) Context => `req.context` is associated by Apollo during their Server's `context` callback
  //   (2) a `Context#telemetry` instance is setup by the Context Constructor
  // ... assuming that the Request has been associated with a Context
  //   which cannot be guaranteed,
  //   so fall back to the Telemetry singleton if need be
  const contextTelemetry = getProperty(context, 'telemetry') || telemetryGlobal;
  if (contextTelemetry.isLogSilent()) {
    // Telemetry logging has been silenced
    return null;
  }

  const sessionId = (context
    ? context.sessionId
    : getProperty(req, SESSION_REQUEST_PROPERTY)
  );

  // "the last index is the furthest address, typically the end-user"
  const remoteAddress = (req.connection && last(forwarded(req)));

  const loggedData = {
    source: 'express',
    action: 'request',

    // inbound
    remoteAddress,
    host: tokens.req(req, res, 'host'), // HTTP requested host (vs. physical hostname)
    method: tokens.method(req, res),
    path,
    sessionId,

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


const WITHJOY_DOMAIN_REGEX = /\.withjoy\.com$/;

export function getDefaultMiddleware(): DefaultMiddlewareResult {
  const preludesMap = new Map<string, RequestHandlerVariant>([
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
    sessionMiddleware(),
    MORGAN_LOGGER,
  ].map(_tupleByMiddlewareName));

  const bodyParsersMap = new Map<string, RequestHandlerVariant>([
    // calling out the default(s) -- @see https://github.com/expressjs/body-parser#bodyparserjsonoptions
    bodyParser.json({ limit: '100Kb' }),
    bodyParser.urlencoded({ extended: false }),
  ].map(_tupleByMiddlewareName));

  const apolloMap = new Map<string, RequestHandlerVariant>([
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
