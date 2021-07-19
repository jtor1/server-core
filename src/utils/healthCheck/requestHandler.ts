import { Request, Response, NextFunction, RequestHandler } from 'express';
import { deriveTelemetryContextFromError } from "@withjoy/telemetry";

import { Context, deriveContextFromRequest } from '../../server/apollo.context';
import { HealthCheckRequestHandlerOptions } from './types';


export function createHealthCheckRequestHandler<T extends Context = Context>(
  options: HealthCheckRequestHandlerOptions<T>
): RequestHandler {
  const { checkers } = options;
  const successStatusCode = options.successStatusCode || 200;
  const failureStatusCode = options.failureStatusCode || 500;
  const nonCritical = new Set(options.nonCritical || []);

  const requestHandler: RequestHandler = async(req: Request, res: Response, next: NextFunction): Promise<void> => {
    const context = deriveContextFromRequest(req) as T;
    if (! context) {
      next(new Error('createHealthCheckRequestHandler: request has no Context'));
      return;
    }

    const resultsByKey: Record<string, boolean> = {};
    await Promise.all(Object.keys(checkers).map(async (key) => {
      const checker = checkers[key];
      try {
        resultsByKey[key] = await checker(context);
      }
      catch (error) {
        // this is *not* expected;
        //   each Health Checker should catch, log and absorb its own Errors
        context.telemetry.error('requestHandler: failure', {
          ...deriveTelemetryContextFromError(error),
          source: 'healthCheck',
          action: 'requestHandler',
          key,
        });
        resultsByKey[key] = false;
      }
    }));

    // non-critical checks do not impact the aggregate
    const aggregate = Object.keys(resultsByKey).every((key) =>
      (nonCritical.has(key) || resultsByKey[key] || false)
    );
    const payload = JSON.stringify(resultsByKey);
    res.status(aggregate ? successStatusCode : failureStatusCode).send(payload);
  }

  return requestHandler;
}
