import cookie from 'cookie';
import { Request, Response, NextFunction, RequestHandler } from 'express'
import { randomBytes } from 'crypto';


export const SESSION_COOKIE_NAME: string = 'joy_session_id';
export const SESSION_REQUEST_PROPERTY: string = 'sessionId';
export const SESSION_HEADER_NAME = 'x-joy-sessionid';

export interface RequestWithSessionID extends Request {
  // `[ SESSION_REQUEST_PROPERTY ]` => "A computed property name in an interface ... ts(1169)"
  sessionId?: string;
}


// we don't want cookie to expire, so set expiration time as far as possible
// in the future without risking unexpected results due to bugs
const FAR_FUTURE_EXPIRES: string = 'Sun, 3 Jan 2038 00:00:00 GMT';
const FAR_FUTURE_MAX_AGE: number = 157680000; // ~5 years, so not tickling limits until 1/2033

interface SessionOptions {
  passive: boolean;   // middleware does not create a new session if none exists
}

function _makeSessionId(): string {
  // 'base64' was used in the code this was taken from, but Base64 is annoying when dealing
  // with it as a cut-and-paste text string -- eg. '/.+-' etc. are interpreted as a word
  // delimiters so a double-click doesn't always capture the whole text. not a strong case
  // but we're not trying to "conserve String length" or do any special encoding, so i think 'hex' is sufficient
  return randomBytes(24).toString('hex')
}


export function generateSessionIdSetCookieHeaderValue(sessionId: string): string {
  return cookie.serialize(SESSION_COOKIE_NAME, sessionId, {
    path: '/',

    // "a given Session ID can be used for both Staging & Production hosts"
    domain: '.withjoy.com',

    httpOnly: true,
    expires: new Date(FAR_FUTURE_EXPIRES),  // for maximum compatibility with IE
    maxAge: FAR_FUTURE_MAX_AGE,             // for everything else

    // don't enforce TLS (mostly for dev purposes)
    secure: false,

    // it appears this is not necessary to share cookies from <subdm1>.withjoy.com:<portA> to <subdm2>.withjoy.com:<portB>
    // end-to-end testing shows 'Lax' works well;
    // we will not be shared as a third-party Cookie
    sameSite: 'lax',
  });
}

export function sessionMiddleware(maybeOptions?: SessionOptions): RequestHandler {
  const opts: SessionOptions = {
    passive: false,
    ...maybeOptions
  }
  return function sessionMiddleware(req: RequestWithSessionID, res: Response, next: NextFunction): void {
    const { headers } = req;

    const cookies = cookie.parse(headers['cookie'] || '');
    const cookieSessionId = (cookies || {})[SESSION_COOKIE_NAME];
    let sessionId = headers[SESSION_HEADER_NAME] || cookieSessionId;
    if (!opts.passive && !sessionId) {
      sessionId = _makeSessionId();
      res.setHeader('Set-Cookie', generateSessionIdSetCookieHeaderValue(sessionId))
      req.headers[SESSION_HEADER_NAME] = sessionId;
    }

    if (Array.isArray(sessionId)) {
      req.sessionId = sessionId[0];
    }
    else if (sessionId) {
      req.sessionId = sessionId;
    }

    next();
  }
}
