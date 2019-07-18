import bodyParser from 'body-parser';
import { Request, Response, NextFunction, RequestHandler } from 'express'

const CONTENT_TYPE: string = 'application/graphql';

// will handle the body => String part
const bodyParserGraphqlText: RequestHandler = bodyParser.text({ type: CONTENT_TYPE });


export function bodyParserGraphql(req: Request, res: Response, next: NextFunction): void {
  const { headers } = req;
  if (headers['content-type'] !== CONTENT_TYPE) {
    // we have One Job
    next();
    return;
  }

  // dervied from `body-parser-graphql`
  //   which makes 'application/json' assumptions that we *don't* want to make
  //   @see https://github.com/graphql-middleware/body-parser-graphql
  bodyParserGraphqlText(req, res, () => {
    headers['content-type'] = 'application/json';
    req.body = {
      query: req.body,
    };
    next();
  });
}
