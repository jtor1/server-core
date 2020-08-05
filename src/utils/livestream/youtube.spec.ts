import 'jest';
import {
  parseYoutube,
} from './youtube';


describe('service/livestreamUrl/youtube', () => {
  describe('parseYoutube', () => {
    it('has minimum requirements', () => {
      expect( parseYoutube('') ).toBeNull();
      expect( parseYoutube('http-ish String') ).toBeNull();

      // it('constrains on domain')
      expect( parseYoutube('https://not-youtube.com/dQw4w9WgXcQ') ).toBeNull();

      // it('requires a Stream ID')
      expect( parseYoutube('https://youtube.com?t=43') ).toBeNull();
      expect( parseYoutube('https://youtu.be/?t=43') ).toBeNull();
    });


    describe('from a full URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=43';

        expect( parseYoutube(TEXT) ).toEqual({
          urlOriginal: TEXT,
          streamId: 'dQw4w9WgXcQ',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        expect( parseYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ') ).toMatchObject({
          streamId: 'dQw4w9WgXcQ',
        });
      });
    });


    describe('from a shortened URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://youtu.be/dQw4w9WgXcQ?t=43';

        expect( parseYoutube(TEXT) ).toEqual({
          urlOriginal: TEXT,
          streamId: 'dQw4w9WgXcQ',
          passwordDetected: false,
        });
      });
    });
  });
});
