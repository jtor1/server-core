//import bodyParser, { OptionsText } from 'body-parser'; 
import cookie from 'cookie';
import { Request, Response, NextFunction, RequestHandler } from 'express'

const SESSION_COOKIE_NAME: string  = 'sessionId';

function _makeSessionId(): string {
    return 'foo';    // TODO
}

//export function bodyParserGraphql(maybeOptions?: OptionsText): RequestHandler {
export default function (maybeOptions?: object): RequestHandler {
//  return function bodyParserGraphql(req: Request, res: Response, next: NextFunction): void {
  return function sessionId(req: Request, res: Response, next: NextFunction): void {
    const { headers } = req;
    const reqAsAny: any = <any>req;

    let sessionId = (cookie.parse(headers['cookie'] || '') || {})[SESSION_COOKIE_NAME]; // too much foo?
    if (!sessionId) {
      sessionId = _makeSessionId();
      res.setHeader('Set-Cookie', cookie.serialize('name', sessionId, {
//        httpOnly: true, .. what? TODO
        maxAge: 60 * 60 * 24 * 7 // 1 week TODO
      }));
    }

    reqAsAny[SESSION_COOKIE_NAME] = sessionId;   // is this right (tix: "held as Request#sessionId")

    next();
//        next(err); TODO .. reminder of how to throw and error
//        return;
  }
}
