import { Context } from '../../server/apollo.context';

export type HealthPredicate = () => Promise<boolean>;
export type HealthChecker<T extends Context = Context> = (context: T) => Promise<boolean>;
export interface HealthCheckProvider<T extends Context = Context> {
  healthChecker: HealthChecker<T>;
};

export type HealthCheckRequestHandlerOptions<T extends Context = Context> = {
  checkers: Record<string, HealthChecker<T>>;
  successStatusCode?: number;
  failureStatusCode?: number;
  nonCritical?: string[], // <keyof this.checkers>[]
};
