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
      chaiExpects( parseLink('ftp://zoom.us/j/4155551212') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseLink('https://not-zoom.us/j/4155551212') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseLink('https://zoom.us/j/') ).to.equal(null);
      chaiExpects( parseLink('https://zoom.us/wc/') ).to.equal(null);
    });


    describe('from a URL', () => {
      // eg. "Copy Invite Link" text

      it('parses a URL', () => {
        // it('parses a Web-Client-launching URL')
        const TEXT = 'https://zoom.us/wc/4155551212';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: TEXT,
          streamId: '4155551212',
          passwordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });

        // it('can be generous')
        chaiExpects( parseLink('https://zoom.us/wc/more/paths/4155551212') ).to.include({
          urlBrowser: 'https://zoom.us/wc/4155551212',
          streamId: '4155551212',
        });
      });

      it('parses a URL with a password', () => {
        // it('honors sub-domains')
        // it('parses an App-launching URL')
        const TEXT = 'https://us04web.zoom.us/j/4155551212?pwd=P4s5w0r6';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          // it('propagates the password')
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          urlBrowser: 'https://zoom.us/wc/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          passwordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: undefined,
        });

        // it('can be generous')
        chaiExpects( parseLink('https://zoom.us/j/more/paths/4155551212?pwd=P4s5w0r6') ).to.include({
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          passwordUrlEmbed: 'P4s5w0r6',
        });
      });

      it('only reformats URLs which it can grok', () => {
        const TEXT = 'https://zoom.us/weird/4155551212';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          urlApp: undefined,
          urlBrowser: undefined,
          streamId: '4155551212',
          passwordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });
      });

      it('detects a non-embedded password', () => {
        const TEXT = 'https://us04web.zoom.us/j/4155551212 (Password: PASSWORD)';

        chaiExpects( parseLink(TEXT) ).to.include({
          urlLinkText: 'https://us04web.zoom.us/j/4155551212',
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: 'https://zoom.us/wc/4155551212',
          streamId: '4155551212',
          passwordDetected: true,
          passwordUrlEmbed: undefined,
          passwordText: 'PASSWORD',
        });
      });
    });


    describe('from "Copy Invitation" text', () => {
      it('parses text without a password', () => {
        // it('parses a Web-Client-launching URL')
        const TEXT = `
Join Zoom Meeting
https://zoom.us/wc/2675551212

Meeting ID: 415 555 1212
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: 'https://zoom.us/wc/2675551212',
          urlApp: 'https://zoom.us/j/2675551212',
          urlBrowser: 'https://zoom.us/wc/2675551212',
          streamId: '2675551212',
          passwordDetected: false,
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
          urlBrowser: 'https://zoom.us/wc/2675551212?pwd=P4s5w0r6',
          streamId: '2675551212',
          passwordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: 'PASSWORD',
        });
      });

      it('only reformats URLs which it can grok', () => {
        const TEXT = `
Soup Nazi is inviting you to a scheduled Zoom meeting.

Topic: Come Back... One Year

Join Zoom Meeting
https://zoom.us/no/soup/for/you/2125551212?pwd=P4s5w0r6

Meeting ID: 212 555 1212
Passcode: PASSWORD
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: 'https://zoom.us/no/soup/for/you/2125551212?pwd=P4s5w0r6',
          urlApp: undefined,
          urlBrowser: undefined,
          streamId: '2125551212',
          passwordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: 'PASSWORD',
        });
      });

      it('detects a non-embedded password', () => {
        const TEXT = `
Larry David is inviting you to a scheduled Zoom meeting.

Topic: Dinner with Michael J. Fox

Join Zoom Meeting
https://us04web.zoom.us/j/2125551212

Meeting ID: 212 555 1212
Passcode: PASSWORD
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.include({
          urlLinkText: 'https://us04web.zoom.us/j/2125551212',
          urlApp: 'https://zoom.us/j/2125551212',
          urlBrowser: 'https://zoom.us/wc/2125551212',
          streamId: '2125551212',
          passwordDetected: true,
          passwordUrlEmbed: undefined,
          passwordText: 'PASSWORD',
        });
      });
    });
  });
});
