import 'jest';
import jwt from 'jsonwebtoken';
import lolex, { InstalledClock, NodeClock } from 'lolex';

import {
  TokenConfig,
  decodeUnverifiedToken,
  verifyAll,
} from './verify.token';


const PAYLOAD = { payload: true };
const EPOCH = 1234567890; // Unix epoch
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
  const clock = lolex.install({
    target: global,
    now: (EPOCH * 1000), // in ms
  });

  try {
    const { secret, options } = TOKEN_CONFIG.auth0.MATCH;
    const token = jwt.sign(
      PAYLOAD,
      Buffer.from(secret.data, secret.encoding as any),
      options
    );
    return token;
  }
  finally {
    clock.uninstall();
  }
})();


describe('verify.token', () => {
  describe('decodeUnverifiedToken', () => {
    it('decodes a token value', () => {
      const result = decodeUnverifiedToken(TOKEN_SIGNED);

      expect(result).toEqual({
        aud: TOKEN_CONFIG.auth0.MATCH.options.audience,
        iat: EPOCH,
        iss: TOKEN_CONFIG.auth0.MATCH.options.issuer,

        ...PAYLOAD,
      });
    });

    it('returns null on a malformed token', () => {
      expect( decodeUnverifiedToken('MALFORMED') ).toBeNull();
      expect( decodeUnverifiedToken(<any>null) ).toBeNull();
      expect( decodeUnverifiedToken(<any>undefined) ).toBeNull();
    });
  });

  describe('verifyAll', () => {
    it('verifies a token value', () => {
      const result = verifyAll(TOKEN_CONFIG, TOKEN_SIGNED);

      expect(result).toEqual({
        aud: TOKEN_CONFIG.auth0.MATCH.options.audience,
        iat: EPOCH,
        iss: TOKEN_CONFIG.auth0.MATCH.options.issuer,

        ...PAYLOAD,
      });
    });

    it('fails with no providers', () => {
      const result = verifyAll(<TokenConfig>{ auth0: {} }, TOKEN_SIGNED);

      // it('returns an Error, rather than throwing it')
      expect(result).toBeInstanceOf(Error);
      expect((<Error>result).message).toMatch(/no matching provider/);
    });

    it('fails with no matching provider', () => {
      const result = verifyAll(<TokenConfig>{
        auth0: {
          OTHER: TOKEN_CONFIG.auth0.OTHER,
        },
      }, TOKEN_SIGNED);

      // it('returns an Error, rather than throwing it')
      //   WAT?
      expect(result).toBeInstanceOf(Error);
      expect((<Error>result).message).toMatch(/no matching provider/);
    });

    it('fails on a malformed token', () => {
      const result = verifyAll(TOKEN_CONFIG, 'MALFORMED');

      // it('returns an Error, rather than throwing it')
      expect(result).toBeInstanceOf(Error);
      expect((<Error>result).message).toMatch(/jwt malformed/);
    });
  });
});
