import { ObjectLiteral } from 'typeorm';


/**
 * @returns {Boolean} true if the Entity has been persisted / issued a `key`
 */
export function hasEntityBeenPersisted<T extends ObjectLiteral>(model: T | null | undefined): boolean {
  if (! model) {
    return false
  };

  // FIXME:  use `EntityManager#hasId(Entity)`
  const { key } = model;
  return ((key !== undefined) && (key !== null));
}
