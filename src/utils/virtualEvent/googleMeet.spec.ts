import { expect as chaiExpects } from 'chai';

import {
  parseLink,
} from './googleMeet';


describe('service/virtualEvent/googleMeet', () => {
  describe('parseUrl', () => {
    it('has minimum requirements', () => {
      chaiExpects( parseLink(<unknown>null as string) ).to.equal(null);
      chaiExpects( parseLink('') ).to.equal(null);
      chaiExpects( parseLink('http-ish String') ).to.equal(null);

      // it('constrains on protocol')
      chaiExpects( parseLink('ftp://meet.google.com/thr-four-ee3') ).to.equal(null);

      // it('constrains on domain')
      chaiExpects( parseLink('https://not-meet.google.com/thr-four-ee3') ).to.equal(null);

      // it('requires a Stream ID')
      chaiExpects( parseLink('https://meet.google.com') ).to.equal(null);
      chaiExpects( parseLink('https://go.meet/') ).to.equal(null);
    });


    describe('from a full URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://meet.google.com/thr-four-ee3';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          streamId: 'thr-four-ee3',
          passwordDetected: false,
        });

        // it('honors sub-domains')
        chaiExpects( parseLink('https://whitelabeled.meet.google.com/thr-four-ee3') ).to.include({
          streamId: 'thr-four-ee3',
        });
      });
    });


    describe('from a shortened URL', () => {
      it('parses a URL', () => {
        const TEXT = 'https://go.meet/thr-four-ee3';

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: TEXT,
          streamId: 'thr-four-ee3',
          passwordDetected: false,
        });
      });
    });


    describe('from "Copy joining info" text', () => {
      it('parses a URL', () => {
        const TEXT = `
To join the video meeting, click this link: https://meet.google.com/thr-four-ee3
Otherwise, to join by phone, dial +1 252-986-3126 and enter this PIN: 333 333 333#
To view more phone numbers, click this link: https://tel.meet/thr-four-ee3?hs=5
        `.trim();

        chaiExpects( parseLink(TEXT) ).to.deep.equal({
          urlLinkText: 'https://meet.google.com/thr-four-ee3',
          streamId: 'thr-four-ee3',
          passwordDetected: false,
        });
      });
    });
  });
});
