import 'jest';
import jwt from 'jsonwebtoken';
import * as TypeMoq from 'typemoq';
import { createRequest } from 'node-mocks-http';
import { Request, Response, NextFunction } from 'express';

import { TokenConfig } from './verify.token';
import {
  deriveTokenValue,
  tokenCheck,
} from './token.check';


describe('token.check', () => {
  describe('deriveTokenValue', () => {
    const TOKEN_VALUE = 'TOKEN_VALUE';

    it('derives a Bearer token value', () => {
      const req = createRequest({
        headers: {
          authorization: `Bearer ${ TOKEN_VALUE }`,
        },
      });
      expect(deriveTokenValue(req)).toBe(TOKEN_VALUE);
    });

    it('returns null without an Authorization type', () => {
      const req = createRequest({
        headers: {
          authorization: TOKEN_VALUE,
        },
      });
      expect(deriveTokenValue(req)).toBeNull();
    });

    it('returns null without an Authorization header', () => {
      const req = createRequest();
      expect(deriveTokenValue(req)).toBeNull();
    });
  });


  describe('tokenCheck', () => {
    const RESPONSE: Response = (<unknown>undefined as Response); // it's ignored
    const TOKEN_CONFIG = <TokenConfig>{
      auth0: {
        MATCH: {
          options: {
            audience: 'MATCH_AUDIENCE',
            issuer: 'https://match.issuer.com',
          },
          secret: {
            data: 'MATCH_SECRET',
            encoding: 'base64',
          },
        },
        OTHER: {
          options: {
            audience: 'OTHER_AUDIENCE',
            issuer: 'https://other.issuer.com',
          },
          secret: {
            data: 'OTHER_SECRET',
            encoding: 'utf8',
          },
        },
      },
    };
    const TOKEN_SIGNED: string = (function signedJWT(): string {
      const { secret, options } = TOKEN_CONFIG.auth0.MATCH;
      return jwt.sign(
        { payload: true },
        Buffer.from(secret.data, secret.encoding),
        options
      );
    })();


    it('returns a middleware Function', () => {
      const middleware = tokenCheck(TOKEN_CONFIG);

      expect(middleware).toBeInstanceOf(Function);
    });

    it('verifies a token value', () => {
      const req = createRequest({
        headers: {
          authorization: `Bearer ${ TOKEN_SIGNED }`,
        },
      });

      const middleware = tokenCheck(TOKEN_CONFIG);
      const nextMock = TypeMoq.Mock.ofType<NextFunction>();
      middleware(req, RESPONSE, nextMock.object);

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.exactly(1)
      );

      // it('exposes the verified token on the Request')
      expect(req.token).toBe(TOKEN_SIGNED);
    });

    it('fails to verify a token value', () => {
      const req = createRequest({
        headers: {
          authorization: `Bearer ${ TOKEN_SIGNED }`,
        },
      });

      const middleware = tokenCheck({
        auth0: {
          // no MATCH
          OTHER: TOKEN_CONFIG.auth0.OTHER,
        },
      });
      const nextMock = TypeMoq.Mock.ofType<NextFunction>();
      middleware(req, RESPONSE, nextMock.object);

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.exactly(1)
      );
      expect(req.token).toBeUndefined();
    });

    it('fails to verify a bad Authorization header', () => {
      const req = createRequest({
        headers: {
          authorization: TOKEN_SIGNED,
        },
      });

      const middleware = tokenCheck(TOKEN_CONFIG);
      const nextMock = TypeMoq.Mock.ofType<NextFunction>();
      middleware(req, RESPONSE, nextMock.object);

      nextMock.verify(
        (mock) => mock(),
        TypeMoq.Times.exactly(1)
      );
      expect(req.token).toBeUndefined();
    });
  });
});
