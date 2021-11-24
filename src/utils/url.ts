import { isDate } from "lodash";
import { URLSearchParams } from "url";

export function urlSearchParamsFromObject(
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