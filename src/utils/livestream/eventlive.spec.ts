import { expect as chaiExpects } from 'chai';

import {
  parseEventLive,
} from './eventlive';


describe('service/livestreamUrl/eventlive', () => {
  describe('parseEventLive', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseEventLive('') ).to.equal(null);
      chaiExpects( parseEventLive('http-ish String') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseEventLive('https://not-evt.live/ACCOUNT/STREAM') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseEventLive('https://evt.live') ).to.equal(null);
      chaiExpects( parseEventLive('https://evt.live/ACCOUNT') ).to.equal(null);
    });


    describe('from a URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://evt.live/ACCOUNT/STREAM';

        chaiExpects( parseEventLive(TEXT) ).to.deep.equal({
          urlOriginal: TEXT,
          streamId: 'ACCOUNT/STREAM',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseEventLive('https://my.evt.live/ACCOUNT/STREAM') ).to.include({
          streamId: 'ACCOUNT/STREAM',
        });

        // it('honors more extenstive pathnames')
        //   https://broadcaster.eventlive.pro/event/<STREAM>/embed
        chaiExpects( parseEventLive('https://my.evt.live/ACCOUNT/STREAM/embed') ).to.include({
          streamId: 'ACCOUNT/STREAM',
        });
      });
    });
  });
});
