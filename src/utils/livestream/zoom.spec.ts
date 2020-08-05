import {
  parseZoomUrl,
} from './zoom';


describe('service/livestreamUrl/zoom', () => {
  describe('parseZoomUrl', () => {
    it('has minimum requirements', () => {
      expect( parseZoomUrl('') ).toBeNull();
      expect( parseZoomUrl('http-ish String') ).toBeNull();

      // it('constrains on protocol')
      expect( parseZoomUrl('ftp://zoom.us/j/4155551212') ).toBeNull();

      // it('constrains on domain')
      expect( parseZoomUrl('https://not-zoom.us/j/4155551212') ).toBeNull();

      // it('requires a Stream ID')
      expect( parseZoomUrl('https://zoom.us/j/') ).toBeNull();
      expect( parseZoomUrl('https://zoom.us/wc/') ).toBeNull();
    });


    describe('from a URL', () => {
      // eg. "Copy Invite Link" text

      it('parses a URL', () => {
        // it('parses a Web-Client-launching URL')
        const TEXT = 'https://zoom.us/wc/4155551212';

        expect( parseZoomUrl(TEXT) ).toEqual({
          urlOriginal: TEXT,
          urlApp: 'https://zoom.us/j/4155551212',
          urlBrowser: TEXT,
          streamId: '4155551212',
          passwordDetected: false,
          passwordUrlEmbed: undefined,
          passwordText: undefined,
        });

        // it('can be generous')
        expect( parseZoomUrl('https://zoom.us/wc/more/paths/4155551212') ).toMatchObject({
          urlBrowser: 'https://zoom.us/wc/4155551212',
          streamId: '4155551212',
        });
      });

      it('parses a URL with a password', () => {
        // it('honors sub-domains')
        // it('parses an App-launching URL')
        const TEXT = 'https://us04web.zoom.us/j/4155551212?pwd=P4s5w0r6';

        expect( parseZoomUrl(TEXT) ).toEqual({
          urlOriginal: TEXT,
          // it('propagates the password')
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          urlBrowser: 'https://zoom.us/wc/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          passwordDetected: true,
          passwordUrlEmbed: 'P4s5w0r6',
          passwordText: undefined,
        });

        // it('can be generous')
        expect( parseZoomUrl('https://zoom.us/j/more/paths/4155551212?pwd=P4s5w0r6') ).toMatchObject({
          urlApp: 'https://zoom.us/j/4155551212?pwd=P4s5w0r6',
          streamId: '4155551212',
          passwordUrlEmbed: 'P4s5w0r6',
        });
      });

      it('only reformats URLs which it can grok', () => {
        const TEXT = 'https://zoom.us/weird/4155551212';

        expect( parseZoomUrl(TEXT) ).toEqual({
          urlOriginal: TEXT,
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

        expect( parseZoomUrl(TEXT) ).toMatchObject({
          urlOriginal: 'https://us04web.zoom.us/j/4155551212',
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

        expect( parseZoomUrl(TEXT) ).toEqual({
          urlOriginal: 'https://zoom.us/wc/2675551212',
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

        expect( parseZoomUrl(TEXT) ).toEqual({
          urlOriginal: 'https://us04web.zoom.us/j/2675551212?pwd=P4s5w0r6',
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

        expect( parseZoomUrl(TEXT) ).toEqual({
          urlOriginal: 'https://zoom.us/no/soup/for/you/2125551212?pwd=P4s5w0r6',
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

        expect( parseZoomUrl(TEXT) ).toMatchObject({
          urlOriginal: 'https://us04web.zoom.us/j/2125551212',
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
