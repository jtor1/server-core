import { IServer } from './server';

export const initApp = (app: IServer, port: number) => {
  let closeCalled = false;
  const gracefulClose = (reason: string): Promise<void> => {
    console.error(`\n${reason} starting`);

    if (closeCalled) {
      console.error('App is already being shut down!');
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
        console.error(`${reason} complete`);
      })
      .catch(err => {
        console.error(`${reason} error!`);
        console.error(err);
        throw err;
      });
  };

  const gracefulRestart = (signalName: string) => {
    gracefulClose(`${signalName}: Graceful restart`)
      .then(() => process.kill(process.pid, signalName))
      .catch(() => process.exit(1));
  };

  const gracefulShutdown = (signalName: string) => {
    gracefulClose(`${signalName}: Graceful shutdown`)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
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

  app.init(port)
    .then(config => {
      console.log(`Server started on ${config.port}`);
    })
    .catch(err => {
      console.error('Error starting server');
      console.error(err);
      process.exit(1);
    });
}