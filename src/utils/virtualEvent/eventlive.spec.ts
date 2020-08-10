import { expect as chaiExpects } from 'chai';

import {
  parseLink,
} from './eventlive';


describe('service/virtualEvent/eventlive', () => {
  describe('parseUrl', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseLink('') ).to.equal(null);
      chaiExpects( parseLink('http-ish String') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseLink('https://not-evt.live/ACCOUNT/STREAM') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseLink('https://evt.live') ).to.equal(null);
      chaiExpects( parseLink('https://evt.live/ACCOUNT') ).to.equal(null);
    });


    describe('from a URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://evt.live/ACCOUNT/STREAM';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          streamId: 'ACCOUNT/STREAM',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseLink('https://my.evt.live/ACCOUNT/STREAM') ).to.include({
          streamId: 'ACCOUNT/STREAM',
        });

        // it('honors more extenstive pathnames')
        //   https://broadcaster.eventlive.pro/event/<STREAM>/embed
        chaiExpects( parseLink('https://my.evt.live/ACCOUNT/STREAM/embed') ).to.include({
          streamId: 'ACCOUNT/STREAM',
        });
      });
    });
  });
});
