import 'jest';
import {
  LivestreamUrlProvider,
  parseLivestreamUrl,
} from './index';


describe('service/livestreamUrl', () => {
  describe('parseLivestreamUrl', () => {
    it('matches nothing', () => {
      expect( parseLivestreamUrl('') ).toBeNull();
      expect( parseLivestreamUrl('http-ish String') ).toBeNull();

      expect( parseLivestreamUrl('https://withjoy.com/meetjoy') ).toBeNull();
    });

    it('matches Zoom', () => {
      const TEXT = 'https://zoom.us/j/4155551212?pwd=P4s5w0r6';

      expect( parseLivestreamUrl(TEXT) ).toEqual({
        provider: LivestreamUrlProvider.zoom,
        text: TEXT,
        urlOriginal: TEXT,
        urlApp: TEXT,
        urlBrowser: 'https://zoom.us/wc/4155551212?pwd=P4s5w0r6',
        streamId: '4155551212',
        passwordDetected: true,
        passwordUrlEmbed: 'P4s5w0r6',
        passwordText: undefined,
      });
    });

    it('matches YouTube', () => {
      const TEXT = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=43';

      expect( parseLivestreamUrl(TEXT) ).toEqual({
        provider: LivestreamUrlProvider.youtube,
        text: TEXT,
        urlOriginal: TEXT,
        streamId: 'dQw4w9WgXcQ',
        passwordDetected: false,
      });
    });

    it('matches Google Meet', () => {
      const TEXT = 'https://meet.google.com/thr-four-ee3';

      expect( parseLivestreamUrl(TEXT) ).toEqual({
        provider: LivestreamUrlProvider.googleMeet,
        text: TEXT,
        urlOriginal: TEXT,
        streamId: 'thr-four-ee3',
        passwordDetected: false,
      });
    });

    it('matches EventLive', () => {
      const TEXT = 'https://evt.live/ACCOUNT/STREAM';

      expect( parseLivestreamUrl(TEXT) ).toEqual({
        provider: LivestreamUrlProvider.eventlive,
        text: TEXT,
        urlOriginal: TEXT,
        streamId: 'ACCOUNT/STREAM',
        passwordDetected: false,
      });
    });
  });
});
