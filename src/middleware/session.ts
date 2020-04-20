import cookie from 'cookie';
import { Request, Response, NextFunction, RequestHandler } from 'express'
import { randomBytes } from 'crypto';

export const SESSION_REQUEST_PROPERTY: string = 'sessionId';

// we don't want cookie to expire, so set expiration time as far as possible
// in the future without risking unexpected results due to bugs
const FAR_FUTURE_EXPIRES: string = 'Sun, 3 Jan 2038 00:00:00 GMT';
const FAR_FUTURE_MAX_AGE: number = 157680000; // ~5 years, so not tickling limits until 1/2033

function _makeSessionId(): string {
  // 'base64' was used in the code this was taken from, but Base64 is annoying when dealing
  // with it as a cut-and-paste text string -- eg. '/.+-' etc. are interpreted as a word
  // delimiters so a double-click doesn't always capture the whole text. not a strong case
  // but we're not trying to "conserve String length" or do any special encoding, so i think 'hex' is sufficient
  return randomBytes(24).toString('hex')
}

export function generateSessionIdCookieHeaderValue(sessionId: string): string {
  return cookie.serialize(SESSION_REQUEST_PROPERTY, sessionId, {
    path: '/',

    // (1) "a given Session ID can be used for both Staging & Production hosts" -- (2) TODO make constant or relocate?
    domain: '.withjoy.com',

    httpOnly: true,
    expires: new Date(FAR_FUTURE_EXPIRES),  // for maximum compatibility with IE
    maxAge: FAR_FUTURE_MAX_AGE,             // for everything else

    // TODO it appears this is not necessary to share cookies from <subdm1>.withjoy.com:<portA> to <subdm2>.withjoy.com:<portB>
    // seems wise to err on the side of reduced scope and expand later if necessary
    //sameSite: 'none',
  });
}

export function sessionMiddleware(maybeOptions?: object): RequestHandler {
  return function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
    const { headers } = req;
    const reqAsAny: any = <any>req;

    const cookies = cookie.parse(headers['cookie'] || '');
    let sessionId = (cookies || {})[SESSION_REQUEST_PROPERTY];
    if (!sessionId) {
      sessionId = _makeSessionId();
      res.setHeader('Set-Cookie', generateSessionIdCookieHeaderValue(sessionId))
    }

    reqAsAny[SESSION_REQUEST_PROPERTY] = headers['x-joy-sessionid'] || sessionId;  // TODO header key as constant (but https://github.com/joylifeinc/event_service/pull/183)

    next();
  }
}
