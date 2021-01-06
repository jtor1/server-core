import { telemetry, deriveTelemetryContextFromError } from '@withjoy/telemetry';

import { commonLogInformation } from '../utils/const';
import { IServer } from './server';


export const initApp = async (app: IServer, port: number): Promise<void> => {
  const commonLogInfo = commonLogInformation();
  let closeCalled = false;

  const gracefulClose = async (reason: string): Promise<void> => {
    telemetry.info('initApp', {
      ...commonLogInfo,
      action: 'starting',
      reason,
    });

    if (closeCalled) {
      telemetry.warn('initApp: App is already being shut down!', {
        ...commonLogInfo,
        action: 'skip',
        reason,
      });

      /**
       * Return a promise which will never be completed,
       * as in parallel someone has already initiated another call to close
       * We want to let the first one decide the fate of the process.
       */
      return new Promise((resolve, reject) => { return; });
    }

    closeCalled = true;
    return app.close()
      .then(() => {
        telemetry.info('initApp', {
          ...commonLogInfo,
          action: 'complete',
          reason,
        });
      })
      .catch(err => {
        telemetry.error('initApp', {
          ...deriveTelemetryContextFromError(err),
          ...commonLogInfo,
          action: 'error',
          reason,
        });
        throw err;
      });
  };

  const gracefulRestart = async (signalName: string) => {
    return gracefulClose(`${signalName}: Graceful restart`)
      .then(() => process.kill(process.pid, signalName))
      .catch(err => {
        telemetry.error('initApp.gracefulRestart', {
          ...deriveTelemetryContextFromError(err),
          ...commonLogInfo,
          action: 'error',
          signalName,
        });
        process.exit(1);
      });
  };

  const gracefulShutdown = async (signalName: string) => {
    return gracefulClose(`${signalName}: Graceful shutdown`)
      .then(() => process.exit(0))
      .catch(err => {
        telemetry.error('initApp.gracefulShutdown', {
          ...deriveTelemetryContextFromError(err),
          ...commonLogInfo,
          action: 'error',
          signalName,
        });
        process.exit(1);
      });
  };

  /**
   * Correctly handle nodemon restarts using SIGUSR2 as per
   * https://github.com/remy/nodemon#controlling-shutdown-of-your-script
   *
   * Basically we want to handle SIGUSR2 only once and do a graceful shutdown
   * After the graceful shutdown, we want to rebroadcast the signal to ourselves
   */
  process.once('SIGUSR2', () => gracefulRestart('SIGUSR2'));

  /**
   * In Ctrl+C scenarios we want to just shutdown
   */
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));

  return app.init(port)
    .then(config => {
      telemetry.info('initApp', {
        ...commonLogInfo,
        action: 'started',
        port: config.port,
      });
    })
    .catch(err => {
      telemetry.error('initApp', {
        ...deriveTelemetryContextFromError(err),
        ...commonLogInfo,
        action: 'error',
      });
      process.exit(1);
    });
}
