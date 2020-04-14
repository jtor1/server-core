import cookie from 'cookie';
import { Request, Response, NextFunction, RequestHandler } from 'express'

const SESSION_COOKIE_NAME: string  = 'sessionId';

function _makeSessionId(): string {
    // not sure the criteria for session id, the following is from ticket:
    // https://withjoy.atlassian.net/browse/ENG-1595
    // random string (a UUID may be confusing)

    // the following yields an 11 character random string, but not gauranteed to be unique
    return Math.random().toString(36).substring(2, 15);
}

export default function (maybeOptions?: object): RequestHandler {
  return function sessionId(req: Request, res: Response, next: NextFunction): void {
    const { headers } = req;
    const reqAsAny: any = <any>req;

    let sessionId = (cookie.parse(headers['cookie'] || '') || {})[SESSION_COOKIE_NAME]; // too much foo?
    if (!sessionId) {
      sessionId = _makeSessionId();
      res.setHeader('Set-Cookie', cookie.serialize(SESSION_COOKIE_NAME, sessionId, {
        path: '/',
        domain: '.withjoy.com',      // TODO set/use as a constant somehow?
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 1 week TODO
        sameSite: 'none',
      }));
    }

    reqAsAny[SESSION_COOKIE_NAME] = sessionId;   // is this right (tix: "held as Request#sessionId")

    next();
  }
}
