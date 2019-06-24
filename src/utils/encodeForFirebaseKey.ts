
type encodingMap = {
  re: RegExp,
  val: string
}

// @see EventsManager#_encodeForFirebaseKey
//   joy.git:modules/eventsManager/eventsManager.js
const forward: encodingMap[] = [
  { re: /\./g, val: "%2E"},                    // "."
  { re: /\$/g, val: encodeURIComponent("$")},  // "$"
  { re: /\[/g, val: encodeURIComponent("[")},  // "["
  { re: /\]/g, val: encodeURIComponent("]")},  // "]"
  { re: /\#/g, val: encodeURIComponent("#")},  // "#"
  { re: /\//g, val: encodeURIComponent("/")},  // "/"
  // to retain backwards compatability, we are *not* adding the following omissions which are not URI-safe
  //   '?'
  //   '&'
  //   whitespace
];

const backward: encodingMap[] = [
  { re: new RegExp("%2E", 'g')                  , val: '.' },
  { re: new RegExp(encodeURIComponent("$"), 'g'), val: '$' },
  { re: new RegExp(encodeURIComponent("["), 'g'), val: '[' },
  { re: new RegExp(encodeURIComponent("]"), 'g'), val: ']' },
  { re: new RegExp(encodeURIComponent("#"), 'g'), val: '#' },
  { re: new RegExp(encodeURIComponent("/"), 'g'), val: '/' },
];

const transform = (mapping: encodingMap[]) => (str: string): string =>
  mapping.reduce(
    (str, {re, val}) => str.replace(re, val),
    str
  )

export const encode = transform(forward);
export const decode = transform(backward);

export default {
  encode,
  decode
};
