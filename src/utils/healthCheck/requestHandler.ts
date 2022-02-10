import { Request, Response, NextFunction, RequestHandler } from 'express';
import { deriveTelemetryContextFromError } from "@withjoy/telemetry";

import { Context, deriveContextFromRequest } from '../../server/apollo.context';
import { executePromiseOrTimeout } from '../execution/timeout';
import { HEALTH_CHECKER_TIMEOUT_MS, HealthCheckRequestHandlerOptions } from './types';


// Configure Liveness, Readiness and Startup Probes
//   https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

export function createHealthCheckRequestHandler<T extends Context = Context>(
  options: HealthCheckRequestHandlerOptions<T>
): RequestHandler {
  const { checkers } = options;
  const timeoutMs = options.timeoutMs || HEALTH_CHECKER_TIMEOUT_MS;
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
        // don't wait forever;
        //   if we eventually get a success, we would appear to be healthy to our logs,
        //   however ... k8s will have given up waiting, and we're actually failed
        //   and been taken out of the load pool, or out behind the barn.
        //   we need visiblity into our failure
        resultsByKey[key] = await executePromiseOrTimeout(timeoutMs, () => checker(context));
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
    const status = (aggregate ? successStatusCode : failureStatusCode);
    res.status(status).json(resultsByKey);
  }

  return requestHandler;
}
