import http from 'http';
import express, { Router } from 'express';
import { telemetry, deriveTelemetryContextFromError } from '@withjoy/telemetry';

import { RequestHandlerVariant } from '../middleware/types';
import { getDefaultMiddleware } from '../middleware/defaults';
import { errorLoggingExpress } from '../middleware/error.logging';
import { ApolloServer } from 'apollo-server-express';


export interface IServer {
  init: (port: number) => Promise<{ port: number }>;
  close: () => Promise<void>;
}

interface ServerConstructor {
  useDefaultMiddleware: boolean;
  middleware?: RequestHandlerVariant[];
  apollo?: ApolloServer;
  apolloMiddleware?: RequestHandlerVariant[];
  routes?: Array<{ path: string, router: Router }>;
  path?: string;
}

export class Server implements IServer {
  public httpServer?: http.Server;
  public app: express.Application

  constructor(args?: ServerConstructor) {
    let middlewareArray: RequestHandlerVariant[] = [];
    let apolloMiddlewareArray: RequestHandlerVariant[] = [];

    this.app = express();

    if (args && args.useDefaultMiddleware) {
      const middlewareDefaults = getDefaultMiddleware();
      middlewareArray = [ ...middlewareDefaults.preludes, ...middlewareDefaults.bodyParsers ];
      apolloMiddlewareArray = middlewareDefaults.apollo;
    }

    this.middleware(args && args.middleware
      ? middlewareArray.concat(args.middleware)
      : middlewareArray
    );
    if (args && args.apollo) {
      this.bootApollo(
        args.apollo,
        (args.apolloMiddleware
          ? apolloMiddlewareArray.concat(args.apolloMiddleware)
          : apolloMiddlewareArray
        ),
        args.path
      );
    }
    this.expressRoutes(args && args.routes ? [...args.routes] : []);
    this.middleware([ errorLoggingExpress ]);
  }

  public init = async (port: number) => {
    await this.bootHttpServer(port);
    return { port };
  }

  public close = async () => {
    try {
      this.unbootHttpServer();
    } catch (err) {
      throw Error(err);
    }
  }

  private bootHttpServer = (port: number) => {
    return new Promise<http.Server>((resolve, reject) => {
      const httpServer = http.createServer(this.app);
      this.httpServer = httpServer;

      const onError = (err: Error) => {
        telemetry.error('Server#bootHttpServer', {
          ...deriveTelemetryContextFromError(err),
          port,
        });
        httpServer.close();
        reject(err)
      }
      httpServer.addListener('error', onError);

      httpServer.listen(port, () => {
        httpServer.removeListener('error', onError);
        resolve(httpServer);
      })
    })
  }

  private unbootHttpServer = () => {
    return new Promise<void>((resolve, reject) => {
      const { httpServer } = this;
      if (! httpServer) {
        resolve();
        return;
      }

      httpServer.addListener('error', reject);

      httpServer.close(() => {
        httpServer.removeListener('error', reject);
        this.httpServer = undefined;
        resolve();
      });
    });
  }

  private middleware(middleware: RequestHandlerVariant[]) {
    middleware.forEach(middleware => {
      this.app.use(middleware);
    });
  }

  private expressRoutes = (routes: Array<{ path: string, router: Router }>) => {
    this.app.use('/healthy', (_, res) => res.sendStatus(200));
    routes.forEach(route => {
      this.app.use(route.path, route.router)
    });
  }

  private bootApollo = (apollo: ApolloServer, apolloMiddleware?: RequestHandlerVariant[], path?: string) => {
    if (apolloMiddleware) {
      this.app.use(path || '/graphql', ...apolloMiddleware);
    }
    apollo.applyMiddleware({
      app: this.app,

      // @see `getDefaultMiddleware`
      //   also, legacy version; CORS disabled by #applyMiddleware
      cors: false,
    });
  }
}
