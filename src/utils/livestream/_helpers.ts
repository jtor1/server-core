export type _LivestreamUrlParseFragment = {
  urlOriginal: string;
  urlApp?: string;
  urlBrowser?: string; // for Grandma
  streamId: string;
  passwordDetected: boolean;
  passwordUrlEmbed?: string;
  passwordText?: string;
};

export type _LivestreamUrlParser = (text: string) => _LivestreamUrlParseFragment | null;

export const _URL_REGEXP = Object.freeze( /(http[^ ]+)/ ) as RegExp;


export function _safelyParseUrl(urlString: string): URL | null {
  try {
    return new URL(urlString);
  }
  catch (err) { // "TypeError [ERR_INVALID_URL]"
    return null;
  }
}

export function _domainMatchFromUrl(url: URL | null, domains: string[]): string | null {
  if (! url) {
    return null;
  }

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
