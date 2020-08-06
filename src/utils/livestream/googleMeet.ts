import {
  _LivestreamUrlParser,
  _URL_REGEXP,

  _safelyParseUrl,
  _domainMatchFromUrl,
  _firstMatchFromLines,
} from './_helpers';


// the range of text payloads we support is best described by the Test Suite
// also, @see
//   [Requirements for using Google Meet](https://support.google.com/a/users/answer/7317473)
const RECOGNIZED_DOMAINS = [ 'meet.google.com', 'go.meet' ];


export const parseGoogleMeet: _LivestreamUrlParser = (text: string) => {
  // line termination is significant whitespace;
  //   mutli-line RegExps aren't the right strategy
  const lines = text.split(/\n/);

  // the text must contain a valid URL of some sort
  const textUrlMatch = _firstMatchFromLines(lines, [ _URL_REGEXP ]);
  if (! textUrlMatch) {
    return null;
  }

  // the URL must be from a domain that we recognize
  const [ _text, urlOriginal ] = textUrlMatch;
  const url = _safelyParseUrl(urlOriginal)!;
  const domain = _domainMatchFromUrl(url, RECOGNIZED_DOMAINS);
  if (! domain) {
    return null;
  }

  // derive the Stream ID;
  //   it's always the pathname (sans leading '/'), regardless of domain
  const { pathname } = url;
  const streamId = pathname?.substring(1);
  if (! streamId) {
    return null;
  }

  return {
    urlOriginal,
    streamId,
    // "Creating a meeting code or password"
    //   https://support.google.com/meet/thread/53513441?hl=en
    //   "If passcode means password there is no such thing in Google Meet."
    passwordDetected: false,
  };
}
