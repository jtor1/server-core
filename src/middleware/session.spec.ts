import 'jest';
import { ifError } from 'assert';
import { RequestHandler } from 'express'
import { createRequest, createResponse } from 'node-mocks-http';
import {
    SESSION_REQUEST_PROPERTY,
    generateSessionIdCookieHeaderValue,
    sessionMiddleware,
} from './session';

const DUMMY_SESSION_ID: string = '335957c0a7b1fe8c97f5e35d372ef3a522b2688c7c98684b';

describe('middleware/session', () => {
  describe('sessionMiddleware', () => {
    const middleware: RequestHandler = sessionMiddleware();

    it('picks up session id from cookie', () => {
      const req = createRequest({
        headers: {
          'cookie': generateSessionIdCookieHeaderValue(DUMMY_SESSION_ID),
        },
      });

      middleware(
        req,
        createResponse(),
        (err) => {
          ifError(err);

          expect(req[SESSION_REQUEST_PROPERTY]).toBe(DUMMY_SESSION_ID);
        }
      );
    });

    it('creates a new valid session id when there is none', () => {
      const req = createRequest();

      middleware(
        req,
        createResponse(),
        (err) => {
          ifError(err);

          const newSessionId = req[SESSION_REQUEST_PROPERTY];

          expect(typeof(newSessionId)).toBe('string');
          expect(newSessionId).not.toBe(DUMMY_SESSION_ID);
          expect(/^[0-9A-Fa-f]{48}$/.test(newSessionId)).toBe(true);
        }
      );
    });

    // TODO - I think we need to check the session id is set on Context, either here or in another test - check session value is set on Context ...
  });
});
