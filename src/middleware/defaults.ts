import { RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
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


export function getDefaultMiddleware(): DefaultMiddlewareResult {
  const preludesMap = new Map<string, RequestHandler>([
    cors(),
    morgan('dev'),
  ].map(_tupleByMiddlewareName));

  const bodyParsersMap = new Map<string, RequestHandler>([
    // calling out the default(s) -- @see https://github.com/expressjs/body-parser#bodyparserjsonoptions
    bodyParser.json({ limit: '100Kb' }),
    bodyParser.urlencoded({ extended: false }),
  ].map(_tupleByMiddlewareName));

  const apolloMap = new Map<string, RequestHandler>([
    bodyParserGraphql,
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
