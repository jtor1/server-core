import 'jest';
import {
  parseGoogleMeet,
} from './googleMeet';


describe('service/livestreamUrl/googleMeet', () => {
  describe('parseGoogleMeet', () => {
    it('has minimum requirements', () => {
      expect( parseGoogleMeet('') ).toBeNull();
      expect( parseGoogleMeet('http-ish String') ).toBeNull();

      // it('constrains on protocol')
      expect( parseGoogleMeet('ftp://meet.google.com/thr-four-ee3') ).toBeNull();

      // it('constrains on domain')
      expect( parseGoogleMeet('https://not-meet.google.com/thr-four-ee3') ).toBeNull();

      // it('requires a Stream ID')
      expect( parseGoogleMeet('https://meet.google.com') ).toBeNull();
      expect( parseGoogleMeet('https://go.meet/') ).toBeNull();
    });


    describe('from a full URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://meet.google.com/thr-four-ee3';

        expect( parseGoogleMeet(TEXT) ).toEqual({
          urlOriginal: TEXT,
          streamId: 'thr-four-ee3',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        expect( parseGoogleMeet('https://whitelabeled.meet.google.com/thr-four-ee3') ).toMatchObject({
          streamId: 'thr-four-ee3',
        });
      });
    });


    describe('from a shortened URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://go.meet/thr-four-ee3';

        expect( parseGoogleMeet(TEXT) ).toEqual({
          urlOriginal: TEXT,
          streamId: 'thr-four-ee3',
          passwordDetected: false,
        });
      });
    });


    describe('from "Copy joining info" text', () => {
      it('parses a URL', () => {
        const TEXT = `
To join the video meeting, click this link: https://meet.google.com/thr-four-ee3
Otherwise, to join by phone, dial +1 252-986-3126 and enter this PIN: 333 333 333#
To view more phone numbers, click this link: https://tel.meet/thr-four-ee3?hs=5
        `.trim();

        expect( parseGoogleMeet(TEXT) ).toEqual({
          urlOriginal: 'https://meet.google.com/thr-four-ee3',
          streamId: 'thr-four-ee3',
          passwordDetected: false,
        });
      });
    });
  });
});
