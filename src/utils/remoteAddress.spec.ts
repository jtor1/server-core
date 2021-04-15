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

    it('derives from multiple "x-forwarded-for" headers', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': <any>[ REMOTE_ADDRESS, 'IGNORED' ],
        },
      });
      expect(deriveRemoteAddress(req)).toBe(REMOTE_ADDRESS);
    });

    it('is tolerant of unexpected scenarios', () => {
      expect(deriveRemoteAddress( undefined )).toBeUndefined();
      expect(deriveRemoteAddress( null )).toBeUndefined();
      expect(deriveRemoteAddress( <any>{} )).toBeUndefined();
      expect(deriveRemoteAddress( createRequest() )).toBeUndefined();

      const req = createRequest({
        headers: {
          'x-forwarded-for': '',
        },
      });
      expect(deriveRemoteAddress(req)).toBeUndefined();
    });
  });
});
