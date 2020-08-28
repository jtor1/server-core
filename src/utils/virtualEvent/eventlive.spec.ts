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


    describe('from a Viewer URL', () => {
      const URL = 'https://evt.live/ACCOUNT/STREAM';

      it('parses a URL', () => {
        chaiExpects( parseLink(URL) ).to.deep.equal({
          urlLinkText: URL,
          streamId: 'STREAM',
          isPasswordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseLink('https://my.evt.live/ACCOUNT/STREAM') ).to.include({
          streamId: 'STREAM',
        });

        // it('honors more extenstive pathnames')
        //   https://broadcaster.eventlive.pro/event/<STREAM>/embed
        chaiExpects( parseLink('https://my.evt.live/ACCOUNT/STREAM/embed') ).to.include({
          streamId: 'STREAM',
        });
      });

      it('derives a URL from anywhere within the text', () => {
        chaiExpects( parseLink(`Link Text: ${ URL }`) ).to.deep.equal({
          urlLinkText: URL,
          streamId: 'STREAM',
          isPasswordDetected: false,
        });
      });
    });


    describe('from a Broadcaster URL', () => {
      const URL = 'https://broadcaster.eventlive.pro/event/STREAM';

      it('parses a URL', () => {
        chaiExpects( parseLink(URL) ).to.deep.equal({
          urlLinkText: URL,
          streamId: 'STREAM',
          isPasswordDetected: false,
        });
      });

      it('derives a URL from anywhere within the text', () => {
        chaiExpects( parseLink(`Link Text: ${ URL }`) ).to.deep.equal({
          urlLinkText: URL,
          streamId: 'STREAM',
          isPasswordDetected: false,
        });
      });
    });
  });
});
