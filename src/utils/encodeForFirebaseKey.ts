
type encodingMap = {
  re: RegExp,
  val: string
}

const forward: encodingMap[] = [
    {re: /\./g,   val:    "%2E"},                     // "."
    {re: /\$/g,   val:    encodeURIComponent("$")},   // "$"
    {re: /\[/g,   val:    encodeURIComponent("[")},   // "["
    {re: /\]/g,   val:    encodeURIComponent("]")},   // "]"
    {re: /\#/g,   val:    encodeURIComponent("#")},   // "#"
    {re: /\//g,   val:    encodeURIComponent("/")}    // "/"
];

const backward: encodingMap[] = [
  { re: new RegExp("%2E", 'g')                  , val: '.' } ,
  { re: new RegExp(encodeURIComponent("$"), 'g'), val: '$' } ,
  { re: new RegExp(encodeURIComponent("["), 'g'), val: '[' } ,
  { re: new RegExp(encodeURIComponent("]"), 'g'), val: ']' } ,
  { re: new RegExp(encodeURIComponent("#"), 'g'), val: '#' } ,
  { re: new RegExp(encodeURIComponent("/"), 'g'), val: '/' }
];

const transform = (mapping: encodingMap[]) => (str: string): string =>
  mapping.reduce(
    (str, {re, val}) => str.replace(re, val),
    str
  )

export const encode = transform(forward);
export const decode = transform(backward);
