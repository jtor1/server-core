import { expect as chaiExpects } from 'chai';

import {
  parseUrl,
} from './youtube';


describe('service/livestreamUrl/youtube', () => {
  describe('parseUrl', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseUrl(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseUrl('') ).to.equal(null);
      chaiExpects( parseUrl('http-ish String') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseUrl('https://not-youtube.com/dQw4w9WgXcQ') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseUrl('https://youtube.com?t=43') ).to.equal(null);
      chaiExpects( parseUrl('https://youtu.be/?t=43') ).to.equal(null);
    });


    describe('from a full URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=43';

        chaiExpects( parseUrl(TEXT) ).to.deep.equal({
          urlOriginal: TEXT,
          streamId: 'dQw4w9WgXcQ',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ') ).to.include({
          streamId: 'dQw4w9WgXcQ',
        });
      });
    });


    describe('from a shortened URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://youtu.be/dQw4w9WgXcQ?t=43';

        chaiExpects( parseUrl(TEXT) ).to.deep.equal({
          urlOriginal: TEXT,
          streamId: 'dQw4w9WgXcQ',
          passwordDetected: false,
        });
      });
    });
  });
});
