import bodyParser, { OptionsText } from 'body-parser';
import { Request, Response, NextFunction, RequestHandler } from 'express'

const CONTENT_TYPE: string = 'application/graphql';

export function bodyParserGraphql(maybeOptions?: OptionsText): RequestHandler {
  // derived from `body-parser-graphql`
  //   which makes 'application/json' assumptions that we *don't* want to make
  //   @see https://github.com/graphql-middleware/body-parser-graphql
  const parser = bodyParser.text({
    ...(maybeOptions || {}),
    type: CONTENT_TYPE, // handle the body => String part
  });

  return function bodyParserGraphql(req: Request, res: Response, next: NextFunction): void {
    const { headers } = req;
    if (headers['content-type'] !== CONTENT_TYPE) {
      // we have One Job
      next();
      return;
    }

    parser(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }

      headers['content-type'] = 'application/json';
      req.body = {
        query: req.body,
      };
      next();
    });
  }
}
