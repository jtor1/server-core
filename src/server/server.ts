import http from 'http';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
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
  routes?: Array<{ path: string, handlers: Array<RequestHandler> }>; 
}

export class Server implements IServer {
  public httpServer?: http.Server;
  private express: express.Application

  constructor(args?: ServerConstructor) {
    const middlewareArray: Array<RequestHandler> = [];
    this.express = express();
    if (args && args.useDefaultMiddleware) {
      middlewareArray.push(cors());
      middlewareArray.push(morgan('dev'));
      middlewareArray.push(bodyParser.json());
      middlewareArray.push(bodyParser.urlencoded({ extended: false }));
    }
    this.middleware(args && args.middleware ? args.middleware : []);
    if (args && args.apollo) {
      this.bootApollo(args.apollo, args.apolloMiddleware);
    }
    if (args && args.routes) {
      this.expressRoutes(args.routes);
    }
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
      this.httpServer = http.createServer(this.express);
      this.httpServer.listen(port, (err: Error) => {
        if (err) {
          console.error(err);
          if (this.httpServer) {
            this.httpServer.close();
          }
          reject(err)
        } else {
          resolve(this.httpServer);
        }
      })
    })
  }

  private unbootHttpServer = () => {
    return new Promise((resolve, reject) => {
      if (!this.httpServer) {
        resolve();
        return;
      }
      this.httpServer.close((err: Error) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  private middleware(middleware: Array<RequestHandler>) {
    middleware.forEach(middleware => {
      this.express.use(middleware);
    });
  }

  private expressRoutes = (routes: Array<{ path: string, handlers: Array<RequestHandler> }>) => {
    this.express.use('/healthy', (_, res) => res.send(200));
    routes.forEach(route => {
      this.express.use(route.path, ...route.handlers)
    });
  }

  private bootApollo = (apollo: ApolloServer, apolloMiddleware?: Array<RequestHandler>) => {
    if (apolloMiddleware) {
      this.express.use('/graphql', ...apolloMiddleware);
    }
    apollo.applyMiddleware({
      app: this.express
    });
  }
}