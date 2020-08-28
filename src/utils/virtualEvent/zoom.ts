import {
  _VirtualEventLinkParser,
  _PATH_DELIMITER,

  _deriveUrlLinkText,
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
const PATHNAME_PREFIX_APP = '/j';  // launches the Zoom App
const PATHNAME_PREFIX_WEB_CLIENT = '/wc/join';  // streams from the browser / Web Client
const RECOGNIZED_PREFIXES = [
  PATHNAME_PREFIX_APP,
  PATHNAME_PREFIX_WEB_CLIENT,
];
const PASSWORD_EMBED_PARAM = 'pwd';
const PASSWORD_REGEXPS = [
  /\((?:Password|Passcode):[ ]+([^\n]+)\)/,  // "Copy Invite Link" text
  /(?:Password|Passcode):[ ]+([^\n]+)/,  // "Copy Invitation" text
].map(Object.freeze) as RegExp[];


export const parseLink: _VirtualEventLinkParser = (text: string) => {
  const urlLinkText = _deriveUrlLinkText(text);
  if (! urlLinkText) {
    return null;
  }

  // the URL must be from a domain that we recognize
  const url = _safelyParseUrl(urlLinkText)!;
  if (! _domainMatchFromUrl(url, RECOGNIZED_DOMAINS)) {
    return null;
  }

  const { pathname } = url;
  if (! pathname) {
    return null;
  }

  // we are strict about what pathname structures we can parse
  const recognizedPrefix = RECOGNIZED_PREFIXES.find((prefix) => pathname.startsWith(prefix));
  if (! recognizedPrefix) {
    return null;
  }

  // derive the Stream ID
  const streamId = pathname
  .substring(recognizedPrefix.length) // excluding the prefix
  .split(_PATH_DELIMITER)
  .pop(); // the last path segment
  if (! streamId) {
    return null;
  }

  // create known variants on the URL
  const urlApp = _stringifiedUrl(url, {
    hostname: CANONICAL_DOMAIN,
    pathname: `${ PATHNAME_PREFIX_APP }/${ streamId }`,
  });
  const urlBrowser = _stringifiedUrl(url, {
    hostname: CANONICAL_DOMAIN,
    pathname: `${ PATHNAME_PREFIX_WEB_CLIENT }/${ streamId }`,
  });


  // line termination is significant whitespace;
  //   mutli-line RegExps aren't the right strategy
  const lines = text.split(/\n/);

  // the URL may have a password
  const parsedSearch = _parsedSearchFromUrl(url);
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
    isPasswordDetected: (!! (passwordUrlEmbed || passwordText)),
    passwordUrlEmbed,
    passwordText,
  };
}
