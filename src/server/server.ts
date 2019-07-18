import http from 'http';
import express, { Request, Response, RequestHandler, ErrorRequestHandler, Router } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { bodyParserGraphql } from '../middleware/body.parser';
import { errorLoggingExpress } from '../middleware/error.logging';
import { ApolloServer } from 'apollo-server-express';

export interface IServer {
  init: (port: number) => Promise<{ port: number }>;
  close: () => Promise<void>;
}

interface ServerConstructor {
  useDefaultMiddleware: boolean;
  middleware?: Array<RequestHandler>;
  apollo?: ApolloServer;
  apolloMiddleware?: Array<RequestHandler>;
  routes?: Array<{ path: string, router: Router }>;
}

export class Server implements IServer {
  public httpServer?: http.Server;
  public app: express.Application

  constructor(args?: ServerConstructor) {
    const middlewareArray: Array<RequestHandler> = [];
    const apolloMiddlewareArray: Array<RequestHandler> = [];

    this.app = express();

    if (args && args.useDefaultMiddleware) {
      middlewareArray.push(cors());
      middlewareArray.push(morgan('dev'));
      middlewareArray.push(bodyParser.json());
      middlewareArray.push(bodyParser.urlencoded({ extended: false }));

      apolloMiddlewareArray.push(bodyParserGraphql);
    }

    this.middleware(args && args.middleware ? [...middlewareArray, ...args.middleware] : middlewareArray);
    if (args && args.apollo) {
      this.bootApollo(args.apollo, args.apolloMiddleware ? [ ...apolloMiddlewareArray, ...args.apolloMiddleware ] : apolloMiddlewareArray);
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
        console.error(err);
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
    return new Promise((resolve, reject) => {
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

  private middleware(middleware: Array<RequestHandler | ErrorRequestHandler>) {
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

  private bootApollo = (apollo: ApolloServer, apolloMiddleware?: Array<RequestHandler>) => {
    if (apolloMiddleware) {
      this.app.use('/graphql', ...apolloMiddleware);
    }
    apollo.applyMiddleware({
      app: this.app
    });
  }
}
