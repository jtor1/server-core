import { get as getProperty } from 'lodash';
import { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { TokenIndexer } from 'morgan';
import bodyParser from 'body-parser';

import { bodyParserGraphql } from './body.parser';

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
    // this is here so that it doesn't spam logs
    return null;
  }

  // (1) Context => `req.context` is associated by Apollo during their Server's `context` callback
  // (2) a `Context#telemetry` instance is setup by the Context Constructor
  // (3) `requestId` is dervied into the resulting Telemetry "context" (vs. the Request or the Context itself)
  const contextTelemetry = getProperty(req, 'context.telemetry');
  const requestId = (contextTelemetry && contextTelemetry.context().requestId); // no fallback
  const xForwardedFor = tokens.req(req, res, 'x-forwarded-for');
  const remoteAddress = xForwardedFor || tokens['remote-addr'](req, res);

  return JSON.stringify({
    source: 'express',
    action: 'request',
    requestId,

    // inbound
    remoteAddress,
    host: tokens.req(req, res, 'host'),
    method: tokens.method(req, res),
    url,

    // outbound (because { immediate: false })
    statusCode: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTimeMs: tokens['response-time'](req, res),
  });
}
const MORGAN_LOGGER = morgan(_morganFormatter, {
  immediate: false,
  stream: process.stdout, // vs. @withjoy/telemetry, because Stream
});


export function getDefaultMiddleware(): DefaultMiddlewareResult {
  const preludesMap = new Map<string, RequestHandler>([
    cors(),
    MORGAN_LOGGER,
  ].map(_tupleByMiddlewareName));

  const bodyParsersMap = new Map<string, RequestHandler>([
    // calling out the default(s) -- @see https://github.com/expressjs/body-parser#bodyparserjsonoptions
    bodyParser.json({ limit: '100Kb' }),
    bodyParser.urlencoded({ extended: false }),
  ].map(_tupleByMiddlewareName));

  const apolloMap = new Map<string, RequestHandler>([
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
