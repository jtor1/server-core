import { Socket } from 'net';
import { createRequest } from 'node-mocks-http';

import {
  deriveRemoteAddress
} from './remoteAddress';

const REMOTE_ADDRESS = '10.0.2.2';


describe('utils/remoteAddress', () => {
  describe('deriveRemoteAddress', () => {
    it('derives from a single "x-forwarded-for" header', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': REMOTE_ADDRESS,
        },
      });
      expect(deriveRemoteAddress(req)).toBe(REMOTE_ADDRESS);
    });

    it('derives the originating Client IP from multiple "x-forwarded-for" headers', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': (<unknown>[ REMOTE_ADDRESS, 'IGNORED' ] as string),
        },
      });
      expect(deriveRemoteAddress(req)).toBe(REMOTE_ADDRESS);

      // it('trusts that the headers were well-formed')
      //   ... which in this case, they were *not*
      expect(deriveRemoteAddress( createRequest({
        headers: {
          'x-forwarded-for': (<unknown>[ '', 'IGNORED' ] as string),
        },
      }) )).toBeUndefined();
    });

    it('derives from an "x-forwarded-for" header with multiple values', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': (<unknown>[ `${ REMOTE_ADDRESS }, IGNORED`, 'IGNORED' ] as string),
        },
      });
      expect(deriveRemoteAddress(req)).toBe(REMOTE_ADDRESS);

      // it('trusts that the headers were well-formed')
      //   ... which in these cases, they were *not*
      expect(deriveRemoteAddress( createRequest({
        headers: {
          'x-forwarded-for': ', IGNORED',
        },
      }) )).toBeUndefined();

      expect(deriveRemoteAddress( createRequest({
        headers: {
          'x-forwarded-for': (<unknown>[ , 'IGNORED' ] as string),
        },
      }) )).toBeUndefined();
    });

    it('does not derive the Socket#remoteAddress', () => {
      // for reasons explained in the method
      const req = createRequest({
        connection: ({ remoteAddress: REMOTE_ADDRESS } as Socket),
      });
      expect(req.connection.remoteAddress).toBe(REMOTE_ADDRESS);

      expect(deriveRemoteAddress(req)).toBeUndefined();
    });

    it('is tolerant of unexpected scenarios', () => {
      expect(deriveRemoteAddress( undefined )).toBeUndefined();
      expect(deriveRemoteAddress( null )).toBeUndefined();
      expect(deriveRemoteAddress( <any>{} )).toBeUndefined();
      expect(deriveRemoteAddress( createRequest() )).toBeUndefined();

      expect(deriveRemoteAddress( createRequest({
        headers: {
          'x-forwarded-for': '',
        },
      }) )).toBeUndefined();
    });
  });
});
