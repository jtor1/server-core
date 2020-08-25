import { expect as chaiExpects } from 'chai';

import {
  VirtualEventProvider,
  parseVirtualEventLink,
} from './index';


describe('service/virtualEvent', () => {
  describe('parseVirtualEventLink', () => {
    it('cannot match a lack-of-text', () => {
      chaiExpects( parseVirtualEventLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseVirtualEventLink('') ).to.equal(null);
    });

    it('matches text without a URL', () => {
      chaiExpects( parseVirtualEventLink('http-ish String') ).to.deep.equal({
        provider: VirtualEventProvider.unknown,
        linkText: 'http-ish String',
        isLinkValid: false,
        isPasswordDetected: false,
      });

      // it('even matches minimal whitespace')
      chaiExpects( parseVirtualEventLink(' ') ).to.deep.equal({
        provider: VirtualEventProvider.unknown,
        linkText: ' ',
        isLinkValid: false,
        isPasswordDetected: false,
      });
    });

    it('matches Zoom', () => {
      const TEXT = 'https://zoom.us/j/4155551212?pwd=P4s5w0r6';

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.zoom,
        linkText: TEXT,
        isLinkValid: true,
        urlLinkText: TEXT,
        urlApp: TEXT,
        urlBrowser: 'https://zoom.us/wc/4155551212?pwd=P4s5w0r6',
        streamId: '4155551212',
        isPasswordDetected: true,
        passwordUrlEmbed: 'P4s5w0r6',
        passwordText: undefined,
      });
    });

    it('matches YouTube', () => {
      const TEXT = 'https://youtube.com/watch?v=dQw4w9WgXcQ&t=43';

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
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

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
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

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.eventlive,
        linkText: TEXT,
        isLinkValid: true,
        urlLinkText: TEXT,
        streamId: 'ACCOUNT/STREAM',
        isPasswordDetected: false,
      });
    });

    it('matches an unknown Provider', () => {
      const TEXT = 'https://withjoy.com/meetjoy';

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.unknown,
        linkText: TEXT,
        urlLinkText: TEXT,
        isLinkValid: true,
        isPasswordDetected: false,
      });
    });
  });
});
