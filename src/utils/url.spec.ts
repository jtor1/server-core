import { URLSearchParams } from "url";
import { urlSearchParamsFromObject, sanitizeAndParseURL, sanitizeURLString } from "./url";

describe("urlSearchParamsFromObject", () => {
    describe("without a UrlSearchParams to modify", () => {
      it("generates an empty UrlSearchParams", () => {
        expect(urlSearchParamsFromObject({}).toString()).toBe("");
      });

      it("generates a populated UrlSearchParams", () => {
        expect(urlSearchParamsFromObject({
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
        expect(urlSearchParamsFromObject({
        }, searchParams).toString()).toBe("param=value");
      });

      it("modifies the UrlSearchParams", () => {
        // it('mutates the URL in-place')
        const built = urlSearchParamsFromObject({
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
        urlSearchParamsFromObject({
          param: null,
        }, searchParams);

        expect(searchParams.toString()).toBe("");
      });

      it("changes a specific parameter to a value", () => {
        urlSearchParamsFromObject({
          param: "changed",
        }, searchParams);

        expect(searchParams.toString()).toBe("param=changed");
      });

      it("changes a specific parameter to multiple values", () => {
        urlSearchParamsFromObject({
          param: ["string", 23],
        }, searchParams);

        expect(searchParams.toString()).toBe(`param=string&param=23`);
      });

      it('does not allow raw Date object', () => {
        expect(() => {
          return urlSearchParamsFromObject({
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