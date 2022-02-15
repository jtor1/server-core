import { Context } from '../../server/apollo.context';

// must be less than the following k8s settings
// ```yaml
// readiness:
//   timeoutSeconds: 3
// liveness:
//   timeoutSeconds: 3
// ```
export const HEALTH_CHECKER_TIMEOUT_MS = 2500; // 2.5s

export type HealthPredicate = () => Promise<boolean>;
export type HealthChecker<T extends Context = Context> = (context: T) => Promise<boolean>;
export interface HealthCheckProvider<T extends Context = Context> {
  healthChecker: HealthChecker<T>;
};

export type HealthCheckRequestHandlerOptions<T extends Context = Context> = {
  // everything that should get checked;
  //   each HealthChecker is checked independently; any single failure doesn't impact the others.
  //   the HTTP payload returned by the endpoint will be a `Record<string, boolean>` of the results
  checkers: Record<string, HealthChecker<T>>;
  // any HealthChecker not responding will be considered failed
  timeoutMs?: number;
  // the HTTP endpoint returns this status code when
  //   all of the `HealthChecker`s pass / resolve `true`
  successStatusCode?: number;
  // the HTTP endpoint returns this status code when
  //   any of the `HealthChecker`s fail / throw / resolve `false`.
  //   you can modify this status code to mask the failure.
  //   (eg. `200` = run all the checks, output an accurate payload, but don't report a failure status)
  //   (it's like marking *everything* as `{ nonCritical }`)
  failureStatusCode?: number;
  // keys in `{ checkers }` which are allowed to fail
  //   the check is run, and it is accurate in the payload, but it doesn't impact aggregate status
  nonCritical?: string[], // <keyof this.checkers>[]
};
