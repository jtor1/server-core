import {
  _VirtualEventLinkParser,
  _PATH_DELIMITER,

  _deriveUrlLinkText,
  _safelyParseUrl,
  _domainMatchFromUrl,
} from './_helpers';


const RECOGNIZED_DOMAINS = [ 'evt.live', 'eventlive.pro' ];


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
  //   'evt.live/<ACCOUNT>/<STREAM>'
  //   'eventlive.pro/event/<STREAM>'
  //   ... which suggests that STREAM is unique across the platform (vs. just ACCOUNT)
  const pathSegments = pathname.slice(1).split(_PATH_DELIMITER);
  if (pathSegments.length < 2) {
    return null;
  }
  const streamId = pathSegments[1];

  return {
    urlLinkText,
    streamId,
    isPasswordDetected: false,
  };
}
