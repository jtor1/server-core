import { expect as chaiExpects } from 'chai';

import {
  parseLink,
} from './unknown';


describe('service/virtualEvent/unknown', () => {
  describe('parseUrl', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseLink('') ).to.equal(null);
      chaiExpects( parseLink('http-ish String') ).to.equal(null);
    });


    describe('from link text', () => {
      it('derives a URL', () => {
        const TEXT = 'https://www.twitch.tv/ninja';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          isPasswordDetected: false,
        });
      });

      it('derives a URL from anywhere within the text', () => {
        chaiExpects( parseLink(`
I'm watching Live_ISS_Stream.

Watch with me at https://www.ustream.tv/channel/live-iss-stream
        `) ).to.deep.equal({
          urlLinkText: 'https://www.ustream.tv/channel/live-iss-stream',
          isPasswordDetected: false,
        });
      });

      it('derives the first URL it finds', () => {
        chaiExpects( parseLink(`
https://livestream.com/
https://video.ibm.com/
https://www.brightcove.com/en/
        `) ).to.deep.equal({
          urlLinkText: 'https://livestream.com/',
          isPasswordDetected: false,
        });
      });
    });
  });
});
