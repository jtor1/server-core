import {
  _VirtualEventLinkParser,

  _deriveUrlLinkText,
  _safelyParseUrl,
  _domainMatchFromUrl,
} from './_helpers';


const RECOGNIZED_DOMAINS = [ 'evt.live' ];
const PATH_DELIMITER = '/';


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
    urlLinkText,
    streamId,
    isPasswordDetected: false,
  };
}
