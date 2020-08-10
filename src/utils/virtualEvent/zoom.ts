import {
  _VirtualEventLinkParser,
  _URL_REGEXP,

  _safelyParseUrl,
  _domainMatchFromUrl,
  _firstMatchFromLines,
  _parsedSearchFromUrl,
  _stringifiedUrl,
} from './_helpers';


// the range of text payloads we support is best described by the Test Suite
// also, @see
//   https://marketplace.zoom.us/docs/guides/guides/client-url-schemes
const CANONICAL_DOMAIN = 'zoom.us';
const RECOGNIZED_DOMAINS = [ CANONICAL_DOMAIN ];
const PATHNAME_PREFIX_APP = '/j';
const PATHNAME_PREFIX_WEB_CLIENT = '/wc';
const PATHNAME_ID_REGEXP = Object.freeze( /([^/]+)$/ ) as RegExp;  // everything after the last slash
const PASSWORD_EMBED_PARAM = 'pwd';
const PASSWORD_REGEXPS = [
  /\((?:Password|Passcode):[ ]+([^\n]+)\)/,  // "Copy Invite Link" text
  /(?:Password|Passcode):[ ]+([^\n]+)/,  // "Copy Invitation" text
].map(Object.freeze) as RegExp[];


export const parseLink: _VirtualEventLinkParser = (text: string) => {
  if (! text) {
    return null;
  }

  // line termination is significant whitespace;
  //   mutli-line RegExps aren't the right strategy
  const lines = text.split(/\n/);

  // the text must contain a valid URL of some sort
  const textUrlMatch = _firstMatchFromLines(lines, [ _URL_REGEXP ]);
  if (! textUrlMatch) {
    return null;
  }

  // the URL must be from a domain that we recognize
  const [ _text, urlLinkText ] = textUrlMatch;
  const url = _safelyParseUrl(urlLinkText)!;
  if (! _domainMatchFromUrl(url, RECOGNIZED_DOMAINS)) {
    return null;
  }

  const { pathname } = url;
  const parsedSearch = _parsedSearchFromUrl(url);
  if (! pathname) {
    return null;
  }

  // derive the Stream ID
  const streamIdMatch = PATHNAME_ID_REGEXP.exec(pathname);
  if (! streamIdMatch) {
    return null;
  }
  const streamId = streamIdMatch[1];

  // identify what type of URL we're dealing with
  const isUrlApp = pathname.startsWith(PATHNAME_PREFIX_APP);
  const isUrlWebClient = pathname.startsWith(PATHNAME_PREFIX_WEB_CLIENT);
  let urlApp: string | undefined = undefined;
  let urlBrowser: string | undefined = undefined;

  if (isUrlApp || isUrlWebClient) {
    // only go down this road if we truly "grok" the URL format
    urlApp = _stringifiedUrl(url, {
      hostname: CANONICAL_DOMAIN,
      pathname: `${ PATHNAME_PREFIX_APP }/${ streamId }`,
    });
    urlBrowser = _stringifiedUrl(url, {
      hostname: CANONICAL_DOMAIN,
      pathname: `${ PATHNAME_PREFIX_WEB_CLIENT }/${ streamId }`,
    });
  }

  // the URL may have a password
  const passwordUrlEmbed = parsedSearch[PASSWORD_EMBED_PARAM] || undefined;

  // the text may have a password, even if the URL does not embed it
  //   Settings > "Embed passcode in invite link for one-click join"
  //   may not be enabled
  const passwordTextMatch = _firstMatchFromLines(lines, PASSWORD_REGEXPS);
  const passwordText = (passwordTextMatch && passwordTextMatch[1]) || undefined;

  return {
    urlLinkText,
    urlApp,
    urlBrowser,
    streamId,
    passwordDetected: (!! (passwordUrlEmbed || passwordText)),
    passwordUrlEmbed,
    passwordText,
  };
}
