import { expect as chaiExpects } from 'chai';

import { VirtualEventProvider } from './types';
import {
  parseLink,
} from './aggregator';


describe('service/virtualEvent/aggregator', () => {
  describe('parseLink', () => {
    it('cannot match a lack-of-text', () => {
      chaiExpects( parseLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseLink('') ).to.equal(null);
    });

    it('matches text without a URL', () => {
      chaiExpects( parseLink('http-ish String') ).to.deep.equal({
        provider: VirtualEventProvider.unknown,
        linkText: 'http-ish String',
        isLinkValid: false,
        isPasswordDetected: false,
      });

      // it('even matches minimal whitespace')
      chaiExpects( parseLink(' ') ).to.deep.equal({
        provider: VirtualEventProvider.unknown,
        linkText: ' ',
        isLinkValid: false,
        isPasswordDetected: false,
      });
    });

    it('matches Zoom', () => {
      const TEXT = 'https://zoom.us/j/4155551212?pwd=P4s5w0r6';

      chaiExpects( parseLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.zoom,
        linkText: TEXT,
        isLinkValid: true,
        urlLinkText: TEXT,
        urlApp: TEXT,
        urlBrowser: 'https://zoom.us/wc/join/4155551212?pwd=P4s5w0r6',
        streamId: '4155551212',
        isPasswordDetected: true,
        passwordUrlEmbed: 'P4s5w0r6',
        passwordText: undefined,
      });
    });

    it('matches YouTube', () => {
      const TEXT = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=43';

      chaiExpects( parseLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.youtube,
        linkText: TEXT,
        isLinkValid: true,
        urlLinkText: TEXT,
        streamId: 'dQw4w9WgXcQ',
        isPasswordDetected: false,
      });
    });

    it('matches Google Meet', () => {
      const TEXT = 'https://meet.google.com/thr-four-ee3';

      chaiExpects( parseLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.googleMeet,
        linkText: TEXT,
        isLinkValid: true,
        urlLinkText: TEXT,
        streamId: 'thr-four-ee3',
        isPasswordDetected: false,
      });
    });

    it('matches EventLive', () => {
      const TEXT = 'https://evt.live/ACCOUNT/STREAM';

      chaiExpects( parseLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.eventlive,
        linkText: TEXT,
        isLinkValid: true,
        urlLinkText: TEXT,
        streamId: 'STREAM',
        isPasswordDetected: false,
      });
    });

    it('matches an unknown Provider', () => {
      const TEXT = 'https://withjoy.com/meetjoy';

      chaiExpects( parseLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.unknown,
        linkText: TEXT,
        urlLinkText: TEXT,
        isLinkValid: true,
        isPasswordDetected: false,
      });
    });
  });
});
