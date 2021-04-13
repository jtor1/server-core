import {
  identity,
  isEmpty,
  isError,
  pick,
  pickBy,
} from 'lodash';
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import {
  telemetry as telemetrySingleton,
  deriveTelemetryContextFromError,
} from '@withjoy/telemetry';

function _deriveTelemetryContextFromError(err: Error) {
  return (deriveTelemetryContextFromError(err).error || {}); // Error context = { error: { ... } }
}

function _loggedNonEmpty(loggable: any): any | undefined {
  return (isEmpty(loggable) ? undefined : JSON.stringify(loggable));
}


export const errorLoggingExpress: ErrorRequestHandler = function errorLoggingExpress(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (! err) {
    // this is someone else's job
    next();
    return;
  }

  // what was requested
  //   sparsely
  //   in a way that won't be JSON-parsed by our upstream log provider
  const requested = pickBy({
    path: req.path,
    params: _loggedNonEmpty(req.params),
    query: _loggedNonEmpty(req.query),
    body: _loggedNonEmpty(req.body),
  }, identity); // eg. `compact`

  const { statusCode } = (err as any); // "Property 'FOO' does not exist on type 'Error'."
  let responded: Record<string, any>;
  let logged: Record<string, any>;

  if (isError(err)) {
    // what we log
    logged = {
      ..._deriveTelemetryContextFromError(err),
      statusCode,
    };

    // how we respond
    responded = pick(logged, 'message', 'name', 'code', 'statusCode');
  }
  else {
    responded = {
      message: String(err),
    };
    logged = responded;
  }

  telemetrySingleton.error('errorLoggingExpress', {
    source: 'express',
    action: 'error',
    error: logged,
    request: requested,
  });

  // we handle the response
  res.status(statusCode || 500).json({
    error: responded,
  });
}
