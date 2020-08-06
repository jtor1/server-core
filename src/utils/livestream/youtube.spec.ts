import { expect as chaiExpects } from 'chai';

import {
  parseYoutube,
} from './youtube';


describe('service/livestreamUrl/youtube', () => {
  describe('parseYoutube', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseYoutube('') ).to.equal(null);
      chaiExpects( parseYoutube('http-ish String') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseYoutube('https://not-youtube.com/dQw4w9WgXcQ') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseYoutube('https://youtube.com?t=43') ).to.equal(null);
      chaiExpects( parseYoutube('https://youtu.be/?t=43') ).to.equal(null);
    });


    describe('from a full URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=43';

        chaiExpects( parseYoutube(TEXT) ).to.deep.equal({
          urlOriginal: TEXT,
          streamId: 'dQw4w9WgXcQ',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ') ).to.include({
          streamId: 'dQw4w9WgXcQ',
        });
      });
    });


    describe('from a shortened URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://youtu.be/dQw4w9WgXcQ?t=43';

        chaiExpects( parseYoutube(TEXT) ).to.deep.equal({
          urlOriginal: TEXT,
          streamId: 'dQw4w9WgXcQ',
          passwordDetected: false,
        });
      });
    });
  });
});
