import http from 'http';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { ApolloServer } from 'apollo-server-express';

export interface IServer {
  init: () => Promise<void>;
  close: () => Promise<void>;
}

interface ServerConstructor {
  useDefaultMiddleware: boolean;
  middleware?: Array<RequestHandler>;
  apollo?: ApolloServer;
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
      this.bootApollo(args.apollo);
    }
  }

  public init = async () => {
    await this.bootHttpServer();
    this.expressRoutes();
  }

  public close = async () => {
    try {
      this.unbootHttpServer();
    } catch (err) {
      throw Error(err);
    }
  }

  private bootHttpServer = () => {
    return new Promise<http.Server>((resolve, reject) => {
      this.httpServer = http.createServer(this.express);
      this.httpServer.listen(9091, (err: Error) => {
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

  private expressRoutes = () => {
    this.express.use('/', (req: Request, res: Response) => {
      res.send('derp');
    });
  }

  private bootApollo = (apollo: ApolloServer) => {
    apollo.applyMiddleware({
      app: this.express
    });
  }
}