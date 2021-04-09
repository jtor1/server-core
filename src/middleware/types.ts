import { RequestHandler, ErrorRequestHandler } from 'express';

// support:
//   handler(req, res, next)
//   handler(err, req, res, next)
export type RequestHandlerVariant = RequestHandler | ErrorRequestHandler;
