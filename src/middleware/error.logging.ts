import urlLib from 'url';
import {
  isError,
  pick,
  get,
} from 'lodash';
import {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express'


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
  const requested = pick(req, 'path', 'params', 'query', 'body');

  const { statusCode, code } = (err as any); // "Property 'FOO' does not exist on type 'Error'."
  let responded: object;
  let logged: object;

  if (isError(err)) {
    // how we respond
    const { message, name, stack } = err;
    responded = { message, name, code, statusCode };

    // what we log
    logged = {
      ...responded,
      stack,
    };
  }
  else {
    responded = {
      message: String(err),
    };
    logged = responded;
  }

  console.error(JSON.stringify({
    error: logged,
    request: requested,
  }));

  // we handle the response
  res.status(statusCode || 500).json({
    error: responded,
  });
}

/**
 * "enrichedError" is from private `enrichError` in `apollo-server-errors`
 *   @see https://github.com/apollographql/apollo-server/blob/master/packages/apollo-server-errors/src/index.ts#L39-L101
 *   "follows similar structure to https://github.com/graphql/graphql-js/blob/master/src/error/GraphQLError.js#L145-L193"
 *
 * @see https://www.apollographql.com/docs/apollo-server/features/errors
 */
export function errorFormattingApollo(enrichedError: any): any {
  if (! enrichedError) {
    // why are we even here?
    return enrichedError;
  }
console.log('---', JSON.stringify(enrichedError));

  const { message, name } = enrichedError;
  const code = get(enrichedError, 'extensions.code')
  const stacktrace = get(enrichedError, 'extensions.exception.stacktrace');
  const stack = (Array.isArray(stacktrace) ? stacktrace.join('\n') : stacktrace);
  console.error(JSON.stringify({
    error: { message, name, code, stack },
  }));

  // pass-thru, no re-formatting
  return enrichedError;
}
