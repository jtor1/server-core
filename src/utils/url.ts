import { isDate } from "lodash";
import { URL, URLSearchParams } from "url";

// we tend to hand parameter key-values pairs around like this
export type ParameterTuples = Record<string, any>;

/**
 * @param struct {Object} an Object / Struct / Record / POJO
 * @param [maybeSearchParams] {URLSearchParams} an optional baseline upon which `struct` will be applied
 * @returns {URLSearchParams} the contents of `struct` injected into a URLSearchParams
 */
export function buildURLSearchParamsFromObject(
  struct: Record<string, any>,
  maybeSearchParams?: URLSearchParams
): URLSearchParams {
  const searchParams = maybeSearchParams || new URLSearchParams("");

  for (const key in struct) {
    const value = struct[key];
    if (isDate(value)) {
      throw new TypeError('Url search parameter can not be raw Date Object');
    }
    if (value === null || value === undefined) {
      searchParams.delete(key);
    } else if (Array.isArray(value)) {
      searchParams.delete(key);
      for (const arrayValue of value) {
        searchParams.append(key, String(arrayValue));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  return searchParams;
}

/**
 * This method performs transformations on a URL String to make it "sane",
 * such as ensuring that it has a protocol, etc.
 *
 * It only respects HTTP protocols;
 *   given an '<ftp://'> URL string, it will get sanitized to '<https://ftp://'.>
 *
 * @param maybeUrl {String} a URL in String form
 * @returns {String} `maybeUrl`, sanitized
 */
export function sanitizeURLString(maybeUrl: string | null | undefined): string | null {
  if (!maybeUrl) {
		return null;
	}
	maybeUrl = maybeUrl.trim()
  const urlParts = maybeUrl.split(/http[s]?:\/{0,}/g);
	const deprotocoled = urlParts[urlParts.length - 1]
	return _protocolizeURLString(deprotocoled);
}

/* @private */
function _protocolizeURLString(maybeUrl: string | null): string | null {
  // return as it is if null or already protocolizedUrl
  if (!maybeUrl || maybeUrl.match(/http[s]?:\/{2,}/g)) {
    return maybeUrl;
  }
  return maybeUrl.startsWith('//') ? `https:${maybeUrl}` : `https://${maybeUrl}`;
}

/**
 * This method performs `sanitizeURLString` on a URL String
 *   and then parses it with the WHATWG URL API.
 *
 * @param maybeUrl {String} a URL in String form
 * @returns {URL} `maybeUrl`, sanitized and parsed
 */
export function sanitizeAndParseURL(maybeUrl: string | null | undefined): URL | null {
  try {
    const sanitizedUrl = sanitizeURLString(maybeUrl);
    if (!sanitizedUrl) {
      return null;
    }
    const url = new URL(sanitizedUrl);
    return url;
} catch (error) {
    return null;
  }
}

// these are the URL properties that we actually care about
export type RestrictedURL = Pick<URL, 'protocol' | 'hostname' | 'pathname' | 'search' | 'searchParams'>;
type PartialRestrictedURL = Partial<RestrictedURL>;
type BuildRestrictedURL = PartialRestrictedURL & Pick<URL, 'hostname'>; // re-Require<>d

/**
 * @param url {URL}
 * @param mutations {Partial<URL>} properties to be changed in `url`
 * @returns {URL} `url`, with changes applied
 */
export function mutateURL(url: URL, mutations: PartialRestrictedURL): URL {
  if (mutations.protocol !== undefined) {
    url.protocol = mutations.protocol;
  }
  if (mutations.hostname !== undefined) {
    url.host = ''; // to prevent conflict; { hostname } is The Authority
    url.hostname = mutations.hostname;
  }
  if (mutations.pathname !== undefined) {
    url.pathname = mutations.pathname;
  }
  if (mutations.searchParams !== undefined) {
    const urlSearchParams = new URLSearchParams(mutations.searchParams);
    const search = `?${ urlSearchParams.toString() }`;
    url.search = search;
  }
  if (mutations.search !== undefined) {
    url.search = mutations.search;
  }

  return url;
}

/**
 * @param struct {Partial<URL>} properties of a URL, which must include 'hostname'
 * @returns {URL} a URL built from the properties of `struct`
 */
export function buildURL(struct: BuildRestrictedURL): URL {
  // just enough to be parseable;
  //   { hostname } is required
  //   everything else is optional; { protocol } has a default
  const skeleton = new URL("https://withjoy.com");
  return mutateURL(skeleton, struct);
}

/**
 * @param urlSearchParams {URLSearchParams}
 * @returns {Object} the contents of `urlSearchParams`, as an Object / Struct / Record / POJO
 */
export function objectFromURLSearchParams(urlSearchParams: URLSearchParams): Record<string, any> {
  let result: ParameterTuples = {};
  for (let [key, value] of urlSearchParams) {
    result[key] = value;
  }
  return result;
}

/**
 * @param url {URL}
 * @returns {String} a root-relative path derived from `url`, including
 * - any `search` / query string
 * - any `hash` / anchor tag
 */
 export function rootRelativePathFromURL(url: URL): string {
  const full = url.toString();

  const absolute = new URL(full);
  absolute.hash = '';
  absolute.pathname = '/';
  absolute.search = '';

  const relative = full.substring(absolute.toString().length - 1); // preserve leading '/'
  return relative;
}