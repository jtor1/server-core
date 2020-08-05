import 'jest';
import {
  parseEventLive,
} from './eventlive';


describe('service/livestreamUrl/eventlive', () => {
  describe('parseEventLive', () => {
    it('has minimum requirements', () => {
      expect( parseEventLive('') ).toBeNull();
      expect( parseEventLive('http-ish String') ).toBeNull();

      // it('constrains on domain')
      expect( parseEventLive('https://not-evt.live/ACCOUNT/STREAM') ).toBeNull();

      // it('requires a Stream ID')
      expect( parseEventLive('https://evt.live') ).toBeNull();
      expect( parseEventLive('https://evt.live/ACCOUNT') ).toBeNull();
    });


    describe('from a URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://evt.live/ACCOUNT/STREAM';

        expect( parseEventLive(TEXT) ).toEqual({
          urlOriginal: TEXT,
          streamId: 'ACCOUNT/STREAM',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        expect( parseEventLive('https://my.evt.live/ACCOUNT/STREAM') ).toMatchObject({
          streamId: 'ACCOUNT/STREAM',
        });

        // it('honors more extenstive pathnames')
        //   https://broadcaster.eventlive.pro/event/<STREAM>/embed
        expect( parseEventLive('https://my.evt.live/ACCOUNT/STREAM/embed') ).toMatchObject({
          streamId: 'ACCOUNT/STREAM',
        });
      });
    });
  });
});
