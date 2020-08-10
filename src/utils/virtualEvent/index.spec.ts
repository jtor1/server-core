import { expect as chaiExpects } from 'chai';

import {
  VirtualEventProvider,
  parseVirtualEventLink,
} from './index';


describe('service/virtualEvent', () => {
  describe('parseVirtualEventLink', () => {
    it('matches nothing', () => {
      chaiExpects( parseVirtualEventLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseVirtualEventLink('') ).to.equal(null);
      chaiExpects( parseVirtualEventLink('http-ish String') ).to.equal(null);

      chaiExpects( parseVirtualEventLink('https://withjoy.com/meetjoy') ).to.equal(null);
    });

    it('matches Zoom', () => {
      const TEXT = 'https://zoom.us/j/4155551212?pwd=P4s5w0r6';

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.zoom,
        linkText: TEXT,
        urlLinkText: TEXT,
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

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.youtube,
        linkText: TEXT,
        urlLinkText: TEXT,
        streamId: 'dQw4w9WgXcQ',
        passwordDetected: false,
      });
    });

    it('matches Google Meet', () => {
      const TEXT = 'https://meet.google.com/thr-four-ee3';

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.googleMeet,
        linkText: TEXT,
        urlLinkText: TEXT,
        streamId: 'thr-four-ee3',
        passwordDetected: false,
      });
    });

    it('matches EventLive', () => {
      const TEXT = 'https://evt.live/ACCOUNT/STREAM';

      chaiExpects( parseVirtualEventLink(TEXT) ).to.deep.equal({
        provider: VirtualEventProvider.eventlive,
        linkText: TEXT,
        urlLinkText: TEXT,
        streamId: 'ACCOUNT/STREAM',
        passwordDetected: false,
      });
    });
  });
});
