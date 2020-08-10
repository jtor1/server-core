import {
  _VirtualEventLinkParser,

  _safelyParseUrl,
  _domainMatchFromUrl,
} from './_helpers';


const RECOGNIZED_DOMAINS = [ 'evt.live' ];
const PATH_DELIMITER = '/';


export const parseLink: _VirtualEventLinkParser = (text: string) => {
  // the URL must be from a domain that we recognize
  const url = _safelyParseUrl(text)!;
  const domain = _domainMatchFromUrl(url, RECOGNIZED_DOMAINS);
  if (! domain) {
    return null;
  }

  const pathname = url?.pathname;
  if (! pathname) {
    return null;
  }

  // derive the Stream ID
  //   '/<ACCOUNT>/<STREAM>'
  const pathSegements = pathname.slice(1).split(PATH_DELIMITER);
  if (pathSegements.length < 2) {
    return null;
  }
  const streamId = pathSegements.slice(0, 2).join(PATH_DELIMITER);

  return {
    urlLinkText: text,
    streamId,
    passwordDetected: false,
  };
}
