import cookie from 'cookie';
import { Request, Response, NextFunction, RequestHandler } from 'express'
import { randomBytes } from 'crypto';

export const SESSION_REQUEST_PROPERTY: string = 'sessionId';

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
    domain: '.withjoy.com', // (1) "a given Session ID can be used for both Staging & Production hosts" -- (2) TODO make constant or relocate?
    httpOnly: true,
//    maxAge: 60 * 60 * 24 * 7, // 1 week TODO --- what to do, what to do
    sameSite: 'none', // TODO check if needed -- if so add comment from PR
  });
}

export function sessionMiddleware(maybeOptions?: object): RequestHandler {
  return function sessionMiddleware(req: Request, res: Response, next: NextFunction): void {
    const { headers } = req;
    const reqAsAny: any = <any>req;

    const cookies = cookie.parse(headers['cookie'] || '');
    let sessionId = (cookies || {})[SESSION_REQUEST_PROPERTY];
console.log('SSSSSS session id = ', sessionId);
    if (!sessionId) {
      sessionId = _makeSessionId();
console.log('SSSSSS not found');
      res.setHeader('Set-Cookie', generateSessionIdCookieHeaderValue(sessionId))
    }

console.log('SSSSSS setting session id', sessionId);
    reqAsAny[SESSION_REQUEST_PROPERTY] = sessionId;

    next();
  }
}
