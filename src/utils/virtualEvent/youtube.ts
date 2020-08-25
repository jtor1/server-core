import {
  _VirtualEventLinkParser,

  _deriveUrlLinkText,
  _safelyParseUrl,
  _domainMatchFromUrl,
  _parsedSearchFromUrl,
} from './_helpers';


const FULL_DOMAIN = 'youtube.com';
const SHORTENED_DOMAIN = 'youtu.be';
const RECOGNIZED_DOMAINS = [ FULL_DOMAIN, SHORTENED_DOMAIN ];


export const parseLink: _VirtualEventLinkParser = (text: string) => {
  const urlLinkText = _deriveUrlLinkText(text);
  if (! urlLinkText) {
    return null;
  }

  // the URL must be from a domain that we recognize
  const url = _safelyParseUrl(urlLinkText)!;
  const domain = _domainMatchFromUrl(url, RECOGNIZED_DOMAINS);
  if (! domain) {
    return null;
  }

  // derive the Stream ID
  const { pathname } = url;
  const parsedSearch = _parsedSearchFromUrl(url);
  let streamId: string | undefined = undefined;

  switch (domain) {
    case FULL_DOMAIN:
      streamId = parsedSearch['v'];
      break;
    case SHORTENED_DOMAIN:
      streamId = pathname?.substring(1); // (sans leading '/')
      break;
  }
  if (! streamId) {
    return null;
  }

  return {
    urlLinkText,
    streamId,
    // "Is there any way to password-protect a live stream?"
    //   https://support.google.com/youtube/thread/36280684?hl=en
    //   "That is not an option that YouTube offers (they are a free service)"
    //   https://www.quora.com/Can-you-make-a-YouTube-livestream-password-protected
    //   "There are three options you can use:
    //    Public, Private, Unlisted.
    //    If you don’t want other people to see your live stream, then choose the unlisted setting ..."
    isPasswordDetected: false,
  };
}
