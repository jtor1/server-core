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

export function sanitizeUrl(uri: string | null | undefined): string | null {
    if (!uri) {
        return null;
    }
    const urlParts = uri.split(/http[s]?:\/{0,}/g);
    const deprotocoled = urlParts[urlParts.length - 1].trim();
    return protocolizeUrl(deprotocoled);
}

export function protocolizeUrl(maybeUrl: string | null): string | null {
    // return as it is if null or already protocolizedUrl
    if (!maybeUrl || maybeUrl.match(/http[s]?:\/{2,}/g)) {
        return maybeUrl;
    }
    return maybeUrl.startsWith('//') ? `https:${maybeUrl}` : `https://${maybeUrl}`;
}

export function sanitizeAndParseUrl(maybeUrl: string | null | undefined): URL | null {
    try {
        const sanitizedUrl = sanitizeUrl(maybeUrl);
        if (!sanitizedUrl) {
            return null;
        }
        const url = new URL(sanitizedUrl);
        return url;
    } catch (error) {
        return null;
    }
}