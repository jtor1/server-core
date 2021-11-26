import { URL, URLSearchParams } from "url";
import { 
  buildURLSearchParamsFromObject,
  sanitizeAndParseURL, 
  sanitizeURLString,
  mutateURL,
  buildURL,
  objectFromURLSearchParams,
  rootRelativePathFromURL
} from "./url";

describe("urls", () => {
  describe("buildURLSearchParamsFromObject", () => {
      describe("without a UrlSearchParams to modify", () => {
        it("generates an empty UrlSearchParams", () => {
          expect(buildURLSearchParamsFromObject({}).toString()).toBe("");
        });

        it("generates a populated UrlSearchParams", () => {
          expect(buildURLSearchParamsFromObject({
            string: "string",
            number: 23,
            null: null,
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

        it("makes no changes", () => {
          expect(buildURLSearchParamsFromObject({
          }, searchParams).toString()).toBe("param=value");
        });

        it("modifies the UrlSearchParams", () => {
          // it('mutates the URL in-place')
          const built = buildURLSearchParamsFromObject({
            string: "string",
            number: 23,
            null: null,
            undefined: undefined,
            array: ["string", false],
          }, searchParams);
          expect(built).toBe(searchParams);

          expect(searchParams.toString()).toBe(
            `param=value&string=string&number=23&array=string&array=false`
          );
        });

        it("removes a specific parameter", () => {
          buildURLSearchParamsFromObject({
            param: null,
          }, searchParams);

          expect(searchParams.toString()).toBe("");
        });

        it("changes a specific parameter to a value", () => {
          buildURLSearchParamsFromObject({
            param: "changed",
          }, searchParams);

          expect(searchParams.toString()).toBe("param=changed");
        });

        it("changes a specific parameter to multiple values", () => {
          buildURLSearchParamsFromObject({
            param: ["string", 23],
          }, searchParams);

          expect(searchParams.toString()).toBe(`param=string&param=23`);
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

  describe("sanitizeURLString", () => {
      it('sanitize url', () => {
          const urls = [
              "http:// https://www.example.com",
              "Custom URL https://www.example.com",
              "http:// http://m.example.com",
              "http://https://m.example.com",
              "http:https://www.example.com",
              "http://example.com",
              "https://example.com",
              "example.com",
              "//example.com"
          ];

          const outputUrls = [
              "https://www.example.com",
              "https://www.example.com",
              "https://m.example.com",
              "https://m.example.com",
              "https://www.example.com",
              "https://example.com",
              "https://example.com",
              "https://example.com",
              "https://example.com"
          ];

          urls.forEach((uri, index) => {
              const parsed = sanitizeURLString(uri);
              expect(parsed).toEqual(outputUrls[index]);
          });
      });

      it('return null if uri is not found', () => {
          expect(sanitizeURLString(null)).toBeNull();
      });
  });

  describe("sanitizeAndParseURL", () => {
      it('sanitize and parse url', () => {
          const urls = [
              "http:// https://www.example.com",
              "Custom URL https://www.example.com",
              "http:// http://m.example.com",
              "http://https://m.example.com",
              "http:https://www.example.com",
              "http://example.com",
              "https://example.com",
              "example.com"
          ];

          const outputUrls = [
              "https://www.example.com/",
              "https://www.example.com/",
              "https://m.example.com/",
              "https://m.example.com/",
              "https://www.example.com/",
              "https://example.com/",
              "https://example.com/",
              "https://example.com/"
          ];

          urls.forEach((uri, index) => {
              const parsed = sanitizeAndParseURL(uri);
              expect(parsed?.toString()).toEqual(outputUrls[index]);
          });
      });

      it('return null url is not found', () => {
          expect(sanitizeAndParseURL(null)).toBeNull();
      });

      it('return null if error while parsing url', () => {
          expect(sanitizeAndParseURL("#@")).toBeNull();
      });
  });

  describe("mutateURL", () => {
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


  describe("buildURL", () => {
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

  describe("objectFromURLSearchParams", () => {
    it('provided tuples -- key-value pairs -- from URLSearchParams', async() => {
      const QUERY_PAYLOAD = {
        param: "value",
        param1: "value1"
      };
      expect(objectFromURLSearchParams(
        new URLSearchParams(QUERY_PAYLOAD)
      )).toEqual(QUERY_PAYLOAD);

      // it('handles an empty URLSearchParams')
      expect(objectFromURLSearchParams(
        new URLSearchParams()
      )).toEqual({});
    });

    it('returns the last value of a parameter having multiple values', async() => {
      // which is reasonable, but may not be optimal behavior

      const searchParams = new URLSearchParams();
      searchParams.append('append', 'A1');
      searchParams.set('set', 'B');
      searchParams.append('append', 'A2');

      expect(searchParams.toString()).toBe('append=A1&set=B&append=A2');
      expect(objectFromURLSearchParams(searchParams)).toEqual({
        append: 'A2', // 'A1' is nowhere to be found
        set: 'B',
      });
    });
  });

  describe("rootRelativePathFromURL", () => {
    it("produces the root-relative URI of a WHATWG URL", () => {
      // a slow built-up, starting with no path

      const url = new URL("http://username:password@absolute.com:80");
      expect( rootRelativePathFromURL(url) ).toBe("/");
      url.hash = "hash";
      expect( rootRelativePathFromURL(url) ).toBe("/#hash");
      url.search = "param=value";
      expect( rootRelativePathFromURL(url) ).toBe("/?param=value#hash");
      url.pathname = "pathname";
      expect( rootRelativePathFromURL(url) ).toBe("/pathname?param=value#hash");

      // then, targeted cases
      //   which are probably redundant, but it never hurts

      expect( rootRelativePathFromURL(new URL(
        "https://absolute.com" // no path
      )) ).toBe("/");

      expect( rootRelativePathFromURL(new URL(
        "https://absolute.com:443/path"
      )) ).toBe("/path");

      expect( rootRelativePathFromURL(new URL(
        "https://absolute.com:443?param=value"
      )) ).toBe("/?param=value");

      expect( rootRelativePathFromURL(new URL(
        "https://absolute.com:443#hash"
      )) ).toBe("/#hash");
    });

    it("produces the root-relative URI of a URL from `safelyBuildURL`", () => {
      expect( rootRelativePathFromURL(buildURL({
        hostname: "absolute.com",
      })) ).toBe("/");

      expect( rootRelativePathFromURL(buildURL({
        hostname: "absolute.com",
        pathname: "/path"
      })) ).toBe("/path");

      expect( rootRelativePathFromURL(buildURL({
        hostname: "absolute.com",
        search: "param=value"
      })) ).toBe("/?param=value");
    });
  });
});