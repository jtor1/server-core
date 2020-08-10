import {
  UrlObject,
  parse as parseUrl,
  format as formatUrl,
} from 'url';
import {
  parse as parseQuerysting,
} from 'querystring';
import { omit } from 'lodash';

export type _VirtualEventLinkParseFragment = {
  urlLinkText: string;
  urlApp?: string;
  urlBrowser?: string; // for Grandma
  streamId: string;
  passwordDetected: boolean;
  passwordUrlEmbed?: string;
  passwordText?: string;
};

export type _VirtualEventLinkParser = (text: string) => _VirtualEventLinkParseFragment | null;

export const _URL_REGEXP = Object.freeze( /(http[^ ]+)/ ) as RegExp;


export function _safelyParseUrl(urlString: string): UrlObject | null {
  // NOTE:  implemented using the [Legacy URL API](https://nodejs.org/dist/latest/docs/api/url.html#url_legacy_url_api)
  //   Commmit 5bab09c92ab40107cc4c04a50e079b39042c32a8 used the [WHATWG URL API](https://nodejs.org/dist/latest/docs/api/url.html#url_the_whatwg_url_api)
  //   which is not supported in Node 6 :(
  try {
    const parsed = parseUrl(urlString);

    // `{ host }` just makes things complicated for `URL.format`
    return omit(parsed, 'host');
  }
  catch (err) { // "TypeError [ERR_INVALID_URL]"
    return null;
  }
}

export function _domainMatchFromUrl(url: UrlObject | null, domains: string[]): string | null {
  const hostname = url?.hostname;
  if (! hostname) {
    return null;
  }

  return domains.find((domain) => {
    return (
      (hostname === domain) ||
      (hostname.endsWith(`.${ domain }`))
    );
  }) || null;
}

export function _firstMatchFromLines(lines: string[], regExps: RegExp[]): RegExpExecArray | null {
  let firstMatch: RegExpExecArray | null = null;
  lines.some((line) => {
    regExps.some((regExp) => {
      firstMatch = regExp.exec(line);
      return firstMatch;
    });
    return firstMatch;
  });

  return firstMatch;
}

export function _parsedSearchFromUrl(url: UrlObject): Record<string, any> {
  const search = url?.search;
  if (! search) {
    return {};
  }

  // omit leading '?'
  const querystring = (search.startsWith('?')
    ? search.substring(1)
    : search
  );
  const parsed = parseQuerysting(querystring);
  return parsed;
}

export function _stringifiedUrl(url: UrlObject, overrides?: Partial<UrlObject>): string {
  const urlExtended = (overrides
    ? { ...url, ...overrides }
    : url
  );
  return formatUrl(urlExtended);
}
