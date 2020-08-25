import {
  _VirtualEventLinkParser,

  _deriveUrlLinkText,
} from './_helpers';


export const parseLink: _VirtualEventLinkParser = (text: string) => {
  const urlLinkText = _deriveUrlLinkText(text);
  if (! urlLinkText) {
    return null;
  }

  // as long as we could scrape a URL from the text, we're good
  return {
    urlLinkText,
    isPasswordDetected: false,
  };
}
