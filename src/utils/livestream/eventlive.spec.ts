import { expect as chaiExpects } from 'chai';

import {
  parseUrl,
} from './eventlive';


describe('service/livestreamUrl/eventlive', () => {
  describe('parseUrl', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseUrl(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseUrl('') ).to.equal(null);
      chaiExpects( parseUrl('http-ish String') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseUrl('https://not-evt.live/ACCOUNT/STREAM') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseUrl('https://evt.live') ).to.equal(null);
      chaiExpects( parseUrl('https://evt.live/ACCOUNT') ).to.equal(null);
    });


    describe('from a URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://evt.live/ACCOUNT/STREAM';

        chaiExpects( parseUrl(TEXT) ).to.deep.equal({
          urlOriginal: TEXT,
          streamId: 'ACCOUNT/STREAM',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseUrl('https://my.evt.live/ACCOUNT/STREAM') ).to.include({
          streamId: 'ACCOUNT/STREAM',
        });

        // it('honors more extenstive pathnames')
        //   https://broadcaster.eventlive.pro/event/<STREAM>/embed
        chaiExpects( parseUrl('https://my.evt.live/ACCOUNT/STREAM/embed') ).to.include({
          streamId: 'ACCOUNT/STREAM',
        });
      });
    });
  });
});
