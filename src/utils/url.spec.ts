import { protocolizeUrl, sanitizeAndParseUrl, sanitizeUrl } from "./url";

describe("sanitizeUrl", () => {
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
            const parsed = sanitizeUrl(uri);
            expect(parsed).toEqual(outputUrls[index]);
        });
    });

    it('return null if uri is not found', () => {
        expect(sanitizeUrl(null)).toBeNull();
    });
});

describe("protocolizeUrl", () => {
    it('adds a protocol to a URL', () => {
        expect(protocolizeUrl('//domain.com/path')).toEqual('https://domain.com/path');
        expect(protocolizeUrl('domain.com/path')).toEqual('https://domain.com/path');
    });

    it('does not need to transform some URLs', () => {
        expect(protocolizeUrl('http://domain.com/path')).toEqual('http://domain.com/path');
        expect(protocolizeUrl('https://domain.com/path')).toEqual('https://domain.com/path');
    });
});

describe("sanitizeAndParseUrl", () => {
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
            const parsed = sanitizeAndParseUrl(uri);
            expect(parsed?.toString()).toEqual(outputUrls[index]);
        });
    });

    it('return null url is not found', () => {
        expect(sanitizeAndParseUrl(null)).toBeNull();
    });

    it('return null if error while parsing url', () => {
        expect(sanitizeAndParseUrl("#@")).toBeNull();
    });
});