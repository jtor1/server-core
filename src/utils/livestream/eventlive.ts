import {
  _LivestreamUrlParser,
  _safelyParseUrl,
  _domainMatchFromUrl,
} from './_helpers';


const RECOGNIZED_DOMAINS = [ 'evt.live' ];
const PATH_DELIMITER = '/';


export const parseEventLive: _LivestreamUrlParser = (urlOriginal: string) => {
  // the URL must be from a domain that we recognize
  const url = _safelyParseUrl(urlOriginal)!;
  const domain = _domainMatchFromUrl(url, RECOGNIZED_DOMAINS);
  if (! domain) {
    return null;
  }

  const { pathname } = url;

  // derive the Stream ID
  //   '/<ACCOUNT>/<STREAM>'
  const pathSegements = (pathname || '').slice(1).split(PATH_DELIMITER);
  if (pathSegements.length < 2) {
    return null;
  }
  const streamId = pathSegements.slice(0, 2).join(PATH_DELIMITER);

  return {
    urlOriginal,
    streamId,
    passwordDetected: false,
  };
}
