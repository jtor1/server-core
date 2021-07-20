import { deriveTelemetryContextFromError } from "@withjoy/telemetry";

import {
  HealthPredicate,
  HealthChecker,
  HealthCheckProvider,
} from './types';


export function healthCheckForPredicate(healthPredicate: HealthPredicate): HealthChecker {
  return async (context) => {
    const { telemetry } = context;

    try {
      const healthy = await healthPredicate();
      return healthy;
    }
    catch (error) {
      telemetry.error('healthCheckForPredicate: failure', {
        ...deriveTelemetryContextFromError(error),
        source: 'healthCheck',
        action: 'healthCheckForPredicate',
        predicate: healthPredicate.name,
      });
      return false;
    }
  };
}


// singletons
const TRUE = Promise.resolve(true);
const FALSE = Promise.resolve(false);

export class HealthCheckState
  implements HealthCheckProvider
{
  // assumed healthy
  private _value: boolean = true;
  constructor() {
    // pre-bound, to support the simple syntax `{ checkers: { baz: stateOfBaz.healthChecker } }`
    this.healthChecker = this.healthChecker.bind(this);
  }

  get value() {
    return this._value;
  }
  set(value: boolean): void {
    this._value = value;
  }
  healthChecker(): Promise<boolean> {
    return (this._value ? TRUE : FALSE);
  }
}
