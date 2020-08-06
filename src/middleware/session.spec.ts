import { expect as chaiExpects } from 'chai';
import { ifError } from 'assert';
import { RequestHandler } from 'express'
import { createRequest, createResponse } from 'node-mocks-http';
import {
    SESSION_COOKIE_NAME,
    SESSION_HEADER_NAME,
    SESSION_REQUEST_PROPERTY,
    generateSessionIdSetCookieHeaderValue,
    sessionMiddleware,
} from './session';

const DUMMY_SESSION_ID: string = '335957c0a7b1fe8c97f5e35d372ef3a522b2688c7c98684b';
const DUMMY_SESSION_ID2: string = '729f123eb53158bce92b182401f2111efe034127db1da749';

describe('middleware/session', () => {
  describe('sessionMiddleware', () => {
    const middleware: RequestHandler = sessionMiddleware();
    const passiveMiddleware: RequestHandler = sessionMiddleware({ passive: true });

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
        (err: any) => {
          ifError(err);

          // check there is no set-cookie header
          chaiExpects(resp.header('set-cookie')).to.equal(undefined);

          // session is is set as request property
          chaiExpects(req[SESSION_REQUEST_PROPERTY]).to.equal(DUMMY_SESSION_ID);

          // an existing cookie is not put in req.headers where there is no custom header
          chaiExpects(req.headers[SESSION_HEADER_NAME]).to.equal(undefined);
        }
      );
    });

    it('picks up session id from session header', () => {
      const req = createRequest({
        headers: {
          [SESSION_HEADER_NAME]: DUMMY_SESSION_ID,
        },
      });
      const resp = createResponse();

      middleware(
        req,
        resp,
        (err: any) => {
          ifError(err);

          // check there is no set-cookie header
          chaiExpects(resp.header('set-cookie')).to.equal(undefined);

          // session is is set as request property
          chaiExpects(req[SESSION_REQUEST_PROPERTY]).to.equal(DUMMY_SESSION_ID);

          // an existing custom session header remains in req.headers
          chaiExpects(req.headers[SESSION_HEADER_NAME]).to.equal(DUMMY_SESSION_ID);
        }
      );
    });

    it('session id in custom header is picked in preference to a cookie', () => {
      const req = createRequest({
        headers: {
          'cookie': `${SESSION_COOKIE_NAME}=${DUMMY_SESSION_ID}`,
          [SESSION_HEADER_NAME]: DUMMY_SESSION_ID2,
        },
      });
      const resp = createResponse();

      middleware(
        req,
        resp,
        (err: any) => {
          ifError(err);

          chaiExpects(req[SESSION_REQUEST_PROPERTY]).to.equal(DUMMY_SESSION_ID2);
        }
      );
    });

    it('creates a new valid session id when there is none', () => {
      const req = createRequest();
      const resp = createResponse();

      middleware(
        req,
        resp,
        (err: any) => {
          ifError(err);

          const newSessionId = req[SESSION_REQUEST_PROPERTY];

          chaiExpects(typeof(newSessionId)).to.equal('string');
          chaiExpects(newSessionId).not.to.equal(DUMMY_SESSION_ID);
          chaiExpects(newSessionId).to.match(/^[0-9A-Fa-f]{48}$/);

          // check the Set-Cookie header is present and correct
          const expectedValue = generateSessionIdSetCookieHeaderValue(newSessionId);
          const actualValue = resp.header('set-cookie');
          chaiExpects(actualValue).not.to.equal(undefined);
          chaiExpects(actualValue).to.equal(expectedValue);

          // session is is set as request property
          chaiExpects(req[SESSION_REQUEST_PROPERTY]).to.equal(newSessionId);

          // session id is set on request headers (for proxying)
          chaiExpects(req.headers[SESSION_HEADER_NAME]).to.equal(newSessionId);
        }
      );
    });

    it('does not create a new session id in passive mode when there is none', () => {
      const req = createRequest();
      const resp = createResponse();

      passiveMiddleware(
        req,
        resp,
        (err: any) => {
          ifError(err);

          chaiExpects(req[SESSION_REQUEST_PROPERTY]).to.equal(undefined);
          chaiExpects(req.headers[SESSION_HEADER_NAME]).to.equal(undefined);
        }
      );
    });
  });
});
