import 'jest';
import { ifError } from 'assert';
import { RequestHandler } from 'express'
import { createRequest, createResponse } from 'node-mocks-http';
import {
    SESSION_COOKIE_NAME,
    SESSION_REQUEST_PROPERTY,
    generateSessionIdSetCookieHeaderValue,
    sessionMiddleware,
} from './session';

const DUMMY_SESSION_ID: string = '335957c0a7b1fe8c97f5e35d372ef3a522b2688c7c98684b';

describe('middleware/session', () => {
  describe('sessionMiddleware', () => {
    const middleware: RequestHandler = sessionMiddleware();

    it('picks up session id from cookie', () => {
      const req = createRequest({
        headers: {
          'cookie': `${SESSION_COOKIE_NAME}=${DUMMY_SESSION_ID}`,
        },
      });
      const resp = createResponse();

      middleware(
        req,
        resp,
        (err) => {
          ifError(err);

          expect(req[SESSION_REQUEST_PROPERTY]).toBe(DUMMY_SESSION_ID);

          // check there is no set-cookie header
          expect(resp.header('set-cookie')).toBeUndefined();
        }
      );
    });

    it('creates a new valid session id when there is none', () => {
      const req = createRequest();
      const resp = createResponse();

      middleware(
        req,
        resp,
        (err) => {
          ifError(err);

          const newSessionId = req[SESSION_REQUEST_PROPERTY];

          expect(typeof(newSessionId)).toBe('string');
          expect(newSessionId).not.toBe(DUMMY_SESSION_ID);
          expect(newSessionId).toMatch(/^[0-9A-Fa-f]{48}$/);

          // check the Set-Cookie header is present and correct
          const expectedValue = generateSessionIdSetCookieHeaderValue(newSessionId);
          const actualValue = resp.header('set-cookie');
          expect(actualValue).toBeDefined();
          expect(actualValue).toBe(expectedValue);
        }
      );
    });

    it('session id in custom header is used in preference to any existing or new cookie session', () => {
      const req = createRequest({
        headers: {
          'x-joy-sessionid': DUMMY_SESSION_ID,
        },
      });
      const resp = createResponse();

      middleware(
        req,
        resp,
        (err) => {
          ifError(err);

          const assignedSessionId = req[SESSION_REQUEST_PROPERTY];

          // a new cookie session id is generated that is different from custom header session id
          const setCookieValue = resp.header('set-cookie');
          expect(setCookieValue).toBeTruthy();
          const assignedSessionIdAsSetCookieHeaderValue = generateSessionIdSetCookieHeaderValue(assignedSessionId);
          expect(assignedSessionIdAsSetCookieHeaderValue).not.toBe(setCookieValue);

          // assigned session id is the value from custom header
          expect(assignedSessionId).toBe(DUMMY_SESSION_ID);
        }
      );
    });
  });
});
