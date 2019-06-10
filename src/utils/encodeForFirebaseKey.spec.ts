import 'jest';
import {encode, decode} from './encodeForFirebaseKey';

describe('encodeForFirebaseKey', () => {

  it('actually alters the input string', () => {
    const TEST_STRING = "$ $$ $>.4..4 4.4.$### 3j#//l[p[p[[[p[p[[][]/a//a/asfdkjasdfjasio3####$$$>.4....4..[][$";
    expect(TEST_STRING).not.toBe(encode(TEST_STRING));
  })

  it('provides an encode and decode operation that are inverses of each other', () => {
    const TEST_STRING = "$ $$ $>.4..4 4.4.$### 3j#//l[p[p[[[p[p[[][]/a//a/asfdkjasdfjasio3####$$$>.4....4..[][$";
    expect(TEST_STRING).toBe(decode(encode(TEST_STRING)));
  });

  it('provides idempotent encode and decode operations', () => {
    const TEST_STRING = "$ $$ $>.4..4 4.4.$### 3j#//l[p[p[[[p[p[[][]/a//a/asfdkjasdfjasio3####$$$>.4....4..[][$";
    const once = encode(TEST_STRING);
    const thrice = encode(encode(encode(TEST_STRING)));
    expect(once).toBe(thrice);
    expect(once).not.toBe(TEST_STRING);
    const onceMore = decode(thrice);
    const thriceMore = decode(decode(decode(once)));
    expect(onceMore).toBe(TEST_STRING);
    expect(thriceMore).toBe(TEST_STRING);
  });

  it('encodes and decodes a specific example', () => {
    const ENCODED = "%24%5B%5D%23%2F!!!%2E";
    const SWEAR_WORD = "$[]#/!!!.";
    expect(ENCODED).toBe(encode(SWEAR_WORD));
    expect(SWEAR_WORD).toBe(decode(ENCODED));
  })

});
