// to save us from TypeScript side-effects of nullable properties that aren't `| null`
export const NULL_STRING = (<unknown>null as string);


const UUID_REGEXP: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUUID(id: string): boolean {
  return ((!! id) && UUID_REGEXP.test(id));
}
