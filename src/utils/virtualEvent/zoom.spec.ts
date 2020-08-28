import { expect as chaiExpects } from 'chai';

import {
  parseLink,
} from './zoom';


describe('service/virtualEvent/zoom', () => {
  describe('parseUrl', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseLink('') ).to.equal(null);
      chaiExpects( parseLink('http-ish String') ).to.equal(null);

      // it('constrains on protocol')
      chaiExpects( parseLink('gopher://zoom.us/j/4155551212') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseLink('https://not-zoom.us/j/4155551212') ).to.equal(null);

      // it('requires a recognized path *and* a Stream ID')
      chaiExpects( parseLink('https://zoom.us/UNRECOGNIZED/4155551212') ).to.equal(null);

      chaiExpects( parseLink('https://zoom.us/j') ).to.equal(null);
      chaiExpects( parseLink('https://zoom.us/j/') ).to.equal(null);

      chaiExpects( parseLink('https://zoom.us/wc/') ).to.equal(null);
      chaiExpects( parseLink('https://zoom.us/wc/4155551212') ).to.equal(null);
      chaiExpects( parseLink('https://zoom.us/wc/join') ).to.equal(null);
      chaiExpects( parseLink('https://zoom.us/wc/join/') ).to.equal(null);
    });


    describe('from an App-launching URL', () => {
      // eg. "Copy Invite Link" text
      const URL = 'https://us04web.zoom.us/j/4155551212';

      it('parses a URL', () => {
        // it('parses a Web-Client-launching URL')
        chaiExpects( parseLink(URL) ).to.deep.equal({
          urlLinkText: URL,
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: 'https://zoom.us/wc/join/4155551212',
          streamId: '4155551212',
          isPasswordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });

        // it('is generous about sub-paths')
        chaiExpects( parseLink('https://zoom.us/j/more/paths/4155551212') ).to.include({
          urlApp: 'https://zoom.us/j/4155551212',
          streamId: '4155551212',
        });
      });

      it('derives a URL from anywhere within the text', () => {
        chaiExpects( parseLink(`Link Text: ${ URL }`) ).to.deep.equal({
          urlLinkText: URL,
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: 'https://zoom.us/wc/join/4155551212',
          streamId: '4155551212',
          isPasswordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });
      });

      it('parses a URL with a password', () => {
        // it('honors sub-domains')
        const TEXT = 'https://us04web.zoom.us/j/4155551212?pwd=P4s5w0r6';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          // it('propagates the password')
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          urlBrowser: 'https://zoom.us/wc/join/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          isPasswordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: undefined,
        });

        // it('is generous about sub-paths')
        chaiExpects( parseLink('https://zoom.us/j/more/paths/4155551212?pwd=P4s5w0r6') ).to.include({
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          passwordUrlEmbed: 'P4s5w0r6',
        });
      });

      it('detects a non-embedded password', () => {
        const TEXT = 'https://us04web.zoom.us/j/4155551212 (Password: PASSWORD)';

        chaiExpects( parseLink(TEXT) ).to.include({
          urlLinkText: 'https://us04web.zoom.us/j/4155551212',
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: 'https://zoom.us/wc/join/4155551212',
          streamId: '4155551212',
          isPasswordDetected: true,
          passwordUrlEmbed: undefined,
          passwordText: 'PASSWORD',
        });
      });
    });


    describe('from a Web Client URL', () => {
      // a URL variant that we're aware of
      const URL = 'https://us02web.zoom.us/wc/join/4155551212';

      it('parses a URL', () => {
        // it('parses a Web-Client-launching URL')
        chaiExpects( parseLink(URL) ).to.deep.equal({
          urlLinkText: URL,
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: 'https://zoom.us/wc/join/4155551212',
          streamId: '4155551212',
          isPasswordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });

        // it('is generous about sub-paths')
        chaiExpects( parseLink('https://us02web.zoom.us/wc/join/more/paths/4155551212') ).to.include({
          urlBrowser: 'https://zoom.us/wc/join/4155551212',
          streamId: '4155551212',
        });
      });
    });


    describe('from "Copy Invitation" text', () => {
      it('parses text without a password', () => {
        // it('parses a Web-Client-launching URL')
        const TEXT = `
Join Zoom Meeting
https://zoom.us/j/2675551212

Meeting ID: 415 555 1212
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: 'https://zoom.us/j/2675551212',
          urlApp: 'https://zoom.us/j/2675551212',
          urlBrowser: 'https://zoom.us/wc/join/2675551212',
          streamId: '2675551212',
          isPasswordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });
      });

      it('parses text with a password', () => {
        // it('honors sub-domains')
        // it('parses an App-launching URL')
        const TEXT = `
Chardee MacDennis is inviting you to a scheduled Zoom meeting.

Topic: The Game of Games

Join Zoom Meeting
https://us04web.zoom.us/j/2675551212?pwd=P4s5w0r6

Meeting ID: 267 555 1212
Passcode: PASSWORD
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: 'https://us04web.zoom.us/j/2675551212?pwd=P4s5w0r6',
          // it('propagates the password')
          urlApp: 'https://zoom.us/j/2675551212?pwd=P4s5w0r6',
          urlBrowser: 'https://zoom.us/wc/join/2675551212?pwd=P4s5w0r6',
          streamId: '2675551212',
          isPasswordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: 'PASSWORD',
        });
      });

      it('detects a non-embedded password', () => {
        const TEXT = `
Soup Nazi is inviting you to a scheduled Zoom meeting.

Topic: Come Back... One Year
Time: Nov 2, 1996 12:30 AM Eastern Time (US and Canada)

Join Zoom Meeting
https://us04web.zoom.us/wc/join/2125551212

Meeting ID: 212 555 1212
Passcode: PASSWORD
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.include({
          urlLinkText: 'https://us04web.zoom.us/wc/join/2125551212',
          urlApp: 'https://zoom.us/j/2125551212',
          urlBrowser: 'https://zoom.us/wc/join/2125551212',
          streamId: '2125551212',
          isPasswordDetected: true,
          passwordUrlEmbed: undefined,
          passwordText: 'PASSWORD',
        });
      });
    });
  });
});
