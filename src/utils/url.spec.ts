import { URL, URLSearchParams } from "url";
import {
  buildURLSearchParamsFromObject,
  sanitizeAndParseURL,
  sanitizeURLString,
  mutateURL,
  buildURL,
  buildObjectFromURLSearchParams,
  rootRelativePathFromURL
} from "./url";

describe("urls", () => {
  describe("#buildURLSearchParamsFromObject", () => {
    describe("without a UrlSearchParams to modify", () => {
      it("generates an empty UrlSearchParams", () => {
        expect(buildURLSearchParamsFromObject({}).toString()).toBe("");
      });

      it("generates a populated UrlSearchParams", () => {
        expect(buildURLSearchParamsFromObject({
          string: "string",
          number: 23,
          null: null,
          undefined: undefined,
          array: ["string", false],
        }).toString()).toBe(
          `string=string&number=23&array=string&array=false`
        );
      });
    });

    describe("when modifying a UrlSearchParams", () => {
      let searchParams: URLSearchParams;

      beforeEach(() => {
        searchParams = new URLSearchParams("param=value");
      });
      afterEach(() => {
        // it('does not mutate the original')
        expect(searchParams.toString()).toBe("param=value");
      });

      it("makes no changes", () => {
        expect(buildURLSearchParamsFromObject({
        }, searchParams).toString()).toBe("param=value");
      });

      it("modifies the UrlSearchParams", () => {
        const built = buildURLSearchParamsFromObject({
          string: "string",
          number: 23,
          null: null,
          undefined: undefined,
          array: ["string", false],
        }, searchParams);

        expect(built.toString()).toBe(
          `param=value&string=string&number=23&array=string&array=false`
        );
      });

      it("removes a specific parameter", () => {
        const built = buildURLSearchParamsFromObject({
          null: null,
          undefined: undefined,
        }, new URLSearchParams("param=value&null=present&undefined=present"));

        expect(built.toString()).toBe("param=value");
      });

      it("changes a specific parameter to a value", () => {
        const built = buildURLSearchParamsFromObject({
          param: "changed",
        }, searchParams);

        expect(built.toString()).toBe("param=changed");
      });

      it("changes a specific parameter to multiple values", () => {
        const built = buildURLSearchParamsFromObject({
          param: ["string", 23],
        }, searchParams);

        expect(built.toString()).toBe(`param=string&param=23`);
      });

      it('does not allow raw Date object', () => {
        expect(() => {
          return buildURLSearchParamsFromObject({
            date: new Date(),
          }, searchParams);
        }).toThrow(/Url search parameter can not be raw Date Object/);
      });

    });
  });


  const INSANE_URLS = [
    "http:// https://www.example.com", // it('only considers the last URL')
    "Custom URL https://www.example.com",
    "http:// http://m.example.com",
    "http://https://m.example.com",
    "http:https://www.example.com",
    " http://example.com", // it('trims whitespace')
    "https://example.com ",
    "http:///example.com", // it('normalizes slashes')
    "https:////example.com",
    "example.com", // it('ensures a protocol')
    "//example.com",
    // ... whereas these are *too* insane
    "///example.com",
    "http://example.com http:",
    "https://example.com https:/",
    "http://example.com http://",
    "https://example.com https:///x",
  ];

  describe("#sanitizeURLString", () => {
    it('sanitize url', () => {
      const SANITIZED_URLS = [
        "https://www.example.com",
        "https://www.example.com",
        "http://m.example.com",
        "https://m.example.com",
        "https://www.example.com",
        "http://example.com",
        "https://example.com",
        "http://example.com",
        "https://example.com",
        "https://example.com",
        "https://example.com",
        // ... this is just what happens
        "https:///example.com",
        "http://example.com http:",
        "https://example.com https:/",
        "http://",
        "https://x",
      ];

      INSANE_URLS.forEach((uri, index) => {
        const parsed = sanitizeURLString(uri);
        expect(parsed).toEqual(SANITIZED_URLS[index]);
      });
    });

    it('return null if uri is not found', () => {
      expect(sanitizeURLString("")).toBeNull();
      expect(sanitizeURLString(null)).toBeNull();
    });

    it('is only built to respect HTTP protocols', () => {
      // which is reasonable, but may not be optimal behavior

      expect(sanitizeURLString("ftp://example.com")).toBe("https://ftp://example.com");
    });
  });

  describe("#sanitizeAndParseURL", () => {
    it('sanitize and parse url', () => {
      const SANITIZED_URLS = [
        "https://www.example.com/", // note the trailing slashes!
        "https://www.example.com/",
        "http://m.example.com/",
        "https://m.example.com/",
        "https://www.example.com/",
        "http://example.com/",
        "https://example.com/",
        "http://example.com/",
        "https://example.com/",
        "https://example.com/",
        "https://example.com/",
        // ... this is just what happens
        "https://example.com/", // <= a bit better than `sanitizeURLString`
        undefined, // unparseable => null
        undefined,
        undefined,
        "https://x/", // <= a bit better than `sanitizeURLString`
      ];

      INSANE_URLS.forEach((uri, index) => {
        const parsed = sanitizeAndParseURL(uri);
        expect(parsed?.toString()).toEqual(SANITIZED_URLS[index]);
      });
    });

    it('return null url is not found', () => {
      expect(sanitizeAndParseURL("")).toBeNull();
      expect(sanitizeAndParseURL(null)).toBeNull();
    });

    it('return null if error while parsing url', () => {
      expect(sanitizeAndParseURL("#@")).toBeNull();
    });

    it('is only built to respect HTTP protocols', () => {
      // which is reasonable, but may not be optimal behavior

      expect(sanitizeAndParseURL("ftp://example.com")?.toString()).toBe("https://ftp//example.com");
    });
  });

  describe("#mutateURL", () => {
    let url: URL;

    beforeEach(() => {
      url = new URL("https://withjoy.com/path?param=value#HASH");
    });

    it("makes no mutations without properties", () => {
      mutateURL(url, {});
      expect(url.toString()).toBe("https://withjoy.com/path?param=value#HASH");
    });

    it("mutates { protocol }", () => {
      // it('mutates the URL in-place')
      const modified = mutateURL(url, {
        protocol: "http:",
      });
      expect(modified).toBe(url);

      expect(url.protocol).toBe("http:");
      expect(url.toString()).toBe("http://withjoy.com/path?param=value#HASH");
    });

    it("mutates { hostname }", () => {
      mutateURL(url, {
        hostname: "modified.net",
      });

      expect(url.hostname).toBe("modified.net");
      expect(url.host).toBe("modified.net");
      expect(url.toString()).toBe("https://modified.net/path?param=value#HASH");
    });

    it("mutates { pathname }", () => {
      mutateURL(url, {
        pathname: "/route/name",
      });

      expect(url.pathname).toBe("/route/name");
      expect(url.toString()).toBe("https://withjoy.com/route/name?param=value#HASH");
    });

    it("mutates { searchParams }", () => {
      mutateURL(url, {
        searchParams: new URLSearchParams("param=changed&added=searchParams"),
      });

      expect(url.search).toBe("?param=changed&added=searchParams");
      expect(url.searchParams.get("added")).toBe("searchParams");
      expect(url.toString()).toBe("https://withjoy.com/path?param=changed&added=searchParams#HASH");
    });

    it("mutates { search }", () => {
      mutateURL(url, {
        search: "?param=changed&added=search",
      });

      expect(url.search).toBe("?param=changed&added=search");
      expect(url.searchParams.get("added")).toBe("search");
      expect(url.toString()).toBe("https://withjoy.com/path?param=changed&added=search#HASH");
    });

    it("mutates all the supported properties at once", () => {
      mutateURL(url, {
        protocol: "http:",
        hostname: "modified.net",
        pathname: "/route/name",
        // NOTE:  different!
        searchParams: new URLSearchParams("param=changed&added=searchParams"),
        search: "?param=changed&added=search",
      });

      // it('prioritizes { search } over { searchParams }')
      // it('leaves other properties, such as { hash }, alone')
      expect(url.toString()).toBe("http://modified.net/route/name?param=changed&added=search#HASH");
    });

    it("mutates with another URL", () => {
      const otherUrl = new URL("http://modified.net/route/name?param=changed&added=search#IGNORED");
      mutateURL(url, otherUrl);

      // it('adopted everything from the other URL')
      // it('leaves other properties, such as { hash }, alone')
      expect(url.toString()).toBe("http://modified.net/route/name?param=changed&added=search#HASH");
    });
  });


  describe("#buildURL", () => {
    it("builds with minimal data", () => {
      const url = buildURL({
        hostname: "specified.com",
      });

      expect(url.toString()).toBe("https://specified.com/");
    });

    it("builds with maximal data", () => {
      const url = buildURL({
        protocol: "http:",
        hostname: "specified.com",
        pathname: "/specific/path",
        searchParams: new URLSearchParams("param=searchParams"),
      });

      expect(url.toString()).toBe("http://specified.com/specific/path?param=searchParams");
    });

    it("prioritizes { search } over { searchParams }", () => {
      const url = buildURL({
        hostname: "specified.com",
        searchParams: new URLSearchParams("param=searchParams"),
        search: "?param=search",
      });

      expect(url.toString()).toBe("https://specified.com/?param=search");
    });
  });

  describe("#buildObjectFromURLSearchParams", () => {
    it('provided tuples -- key-value pairs -- from URLSearchParams', async () => {
      const QUERY_PAYLOAD = {
        param: "value",
        param1: "value1"
      };
      expect(buildObjectFromURLSearchParams(
        new URLSearchParams(QUERY_PAYLOAD)
      )).toEqual(QUERY_PAYLOAD);

      // it('handles an empty URLSearchParams')
      expect(buildObjectFromURLSearchParams(
        new URLSearchParams()
      )).toEqual({});
    });

    it('returns the last value of a parameter having multiple values', async () => {
      // which is reasonable, but may not be optimal behavior

      const searchParams = new URLSearchParams();
      searchParams.append('append', 'A1');
      searchParams.set('set', 'B');
      searchParams.append('append', 'A2');

      expect(searchParams.toString()).toBe('append=A1&set=B&append=A2');
      expect(buildObjectFromURLSearchParams(searchParams)).toEqual({
        append: 'A2', // 'A1' is nowhere to be found
        set: 'B',
      });
    });
  });

  describe("#rootRelativePathFromURL", () => {
    it("produces the root-relative URI of a WHATWG URL", () => {
      // a slow built-up, starting with no path

      const url = new URL("http://username:password@absolute.com:80");
      expect(rootRelativePathFromURL(url)).toBe("/");
      url.hash = "hash";
      expect(rootRelativePathFromURL(url)).toBe("/#hash");
      url.search = "param=value";
      expect(rootRelativePathFromURL(url)).toBe("/?param=value#hash");
      url.pathname = "pathname";
      expect(rootRelativePathFromURL(url)).toBe("/pathname?param=value#hash");

      // then, targeted cases
      //   which are probably redundant, but it never hurts

      expect(rootRelativePathFromURL(new URL(
        "https://absolute.com" // no path
      ))).toBe("/");

      expect(rootRelativePathFromURL(new URL(
        "https://absolute.com:443/path"
      ))).toBe("/path");

      expect(rootRelativePathFromURL(new URL(
        "https://absolute.com:443?param=value"
      ))).toBe("/?param=value");

      expect(rootRelativePathFromURL(new URL(
        "https://absolute.com:443#hash"
      ))).toBe("/#hash");
    });

    it("produces the root-relative URI of a URL from `buildURL`", () => {
      expect(rootRelativePathFromURL(buildURL({
        hostname: "absolute.com",
      }))).toBe("/");

      expect(rootRelativePathFromURL(buildURL({
        hostname: "absolute.com",
        pathname: "/path"
      }))).toBe("/path");

      expect(rootRelativePathFromURL(buildURL({
        hostname: "absolute.com",
        search: "param=value"
      }))).toBe("/?param=value");
    });
  });
});
