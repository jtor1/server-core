import 'jest';
import {encode, decode} from './encodeForFirebaseKey';

describe('encodeForFirebaseKey', () => {
  const TEST_STRING_DECODED = "$ $$ $>.4..4 4.4.$### 3j#//l[p[p[[[p[p[[][]/a//a/asfdkjasdfjasio3####$$$>.4....4..[][$";
  const TEST_STRING_ENCODED = encode(TEST_STRING_DECODED);
  expect(TEST_STRING_DECODED).not.toBe(TEST_STRING_ENCODED);


  it('provides an encode and decode operation that are inverses of each other', () => {
    expect(TEST_STRING_DECODED).toBe( decode(encode(TEST_STRING_DECODED)) );
  });

  it('provides idempotent encode and decode operations', () => {
    const once = encode(TEST_STRING_DECODED);
    const thrice = encode(encode(encode(TEST_STRING_DECODED)));
    expect(once).toBe(thrice);
    expect(once).not.toBe(TEST_STRING_DECODED);

    const onceMore = decode(thrice);
    const thriceMore = decode(decode(decode(once)));
    expect(onceMore).toBe(TEST_STRING_DECODED);
    expect(thriceMore).toBe(TEST_STRING_DECODED);
  });

  it('encodes and decodes a specific example', () => {
    const ENCODED = "%24%5B%5D%23%2F!!!%2E";
    const SWEAR_WORD = "$[]#/!!!.";
    expect(ENCODED).toBe(encode(SWEAR_WORD));
    expect(SWEAR_WORD).toBe(decode(ENCODED));
  });


  describe('encode', () => {
    it('actually alters the input string', () => {
      expect(TEST_STRING_DECODED).not.toBe(encode(TEST_STRING_DECODED));
    })

    it('does not encode some URI-unsafe characters', () => {
      expect(encode('seriously?')).toBe('seriously?');
      expect(encode('wine & popcorn')).toBe('wine & popcorn');
      expect(encode('  whitespace  ')).toBe('  whitespace  ');
    });
  });


  describe('decode', () => {
    it('actually alters the input string', () => {
      expect(TEST_STRING_ENCODED).not.toBe(decode(TEST_STRING_ENCODED));
    })
  });
});
