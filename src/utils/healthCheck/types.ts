import { Context } from '../../server/apollo.context';

// must be less than the following k8s settings
// as found in 'ops.git:values/deployments/*.yaml'
// ```yaml
// readiness:
//   timeoutSeconds: 5
// liveness:
//   timeoutSeconds: 5
// ```
export const HEALTH_CHECKER_TIMEOUT_MS = 4500; // 4.5s

export type HealthPredicate = () => Promise<boolean>;
export type HealthChecker<T extends Context = Context> = (context: T) => Promise<boolean>;
export interface HealthCheckProvider<T extends Context = Context> {
  healthChecker: HealthChecker<T>;
};

export type HealthCheckRequestHandlerOptions<T extends Context = Context> = {
  /**
   * Everything that should get checked.
   *
   * Each HealthChecker is checked independently; any single failure doesn't impact the others.
   * The HTTP payload returned by the endpoint will be a `Record<string, boolean>` of the results.
   */
  checkers: Record<string, HealthChecker<T>>;
  /**
   * Any HealthChecker not responding within this timeframe will be considered failed.
   */
  timeoutMs?: number;
  /**
   * The HTTP endpoint returns this status code when all of the `HealthChecker`s pass / resolve `true`,
   */
  successStatusCode?: number;
  /**
   * The HTTP endpoint returns this status code when any of the `HealthChecker`s fail / throw / resolve `false`.
   *
   * You could modify this status code to mask the failure,
   * eg. `200` = run all the checks, output an accurate payload, but don't report an aggregate failure status.
   * That'd be like marking *everything* as `{ nonCritical }`.
   */
  failureStatusCode?: number;
  /**
   * Keys in `{ checkers }` which are allowed to fail.
   *
   * The check is run, and it is accurate in the payload, but it doesn't impact aggregate status.
   */
  nonCritical?: string[], // <keyof this.checkers>[]
  /**
   * Keys in `{ checkers }` which are run out-of-band.
   *
   * The check is run asynchronously, and no one waits for it to finish.
   *
   * - it does not contribute to the aggregate status, nor the duration, of the health check.
   * - its result is not included in the aggregate JSON payload of all checks.
   * - if the check fails, that gets logged independently.
   *
   * By its nature, an out-of-band check is also `{ nonCritical }`.
   */
  outOfBand?: string[], // <keyof this.checkers>[]
};
