import { Repository, DeepPartial } from 'typeorm';

import { Template } from '../templates/entity.template';


const EMPTY_OBJECT = Object.freeze({});

export enum EntityDeltaType {
  noop = 'noop',
  create = 'create',
  update = 'update',
  delete = 'delete',
}
export interface IEntityDelta<T extends Template> {
  oldEntity: T;
  newEntity: T;
  type: EntityDeltaType;
}


export function buildSnapshotDelta<T extends Template>(entity: T): IEntityDelta<T> {
  // take a snapshot
  //   "Using Class Types in Generics"
  //   https://www.typescriptlang.org/docs/handbook/generics.html#using-class-types-in-generics
  const Entity = (entity.constructor as { new(): T; });
  const oldEntity = Object.assign(new Entity(), entity);

  return {
    oldEntity, // a snapshot
    newEntity: entity, // the entity to be mutated
    type: EntityDeltaType.update,
  }
}

export function buildCreateDelta<T extends Template>(entity: T): IEntityDelta<T> {
  return {
    oldEntity: (EMPTY_OBJECT as T), // it didn't exist before; *everything* has changed
    newEntity: entity, // the entity to be mutated
    type: EntityDeltaType.create,
  }
}

export function isCreateDelta(delta: IEntityDelta<Template>): boolean {
  return (delta.type === EntityDeltaType.create);
}

export function buildDeleteDelta<T extends Template>(entity: T): IEntityDelta<T> {
  return {
    oldEntity: entity, // current state
    newEntity: (EMPTY_OBJECT as T), // it no longer exists; *everything* has changed
    type: EntityDeltaType.delete,
  }
}

export function isDeleteDelta(delta: IEntityDelta<Template>): boolean {
  return (delta.type === EntityDeltaType.delete);
}

export function buildNoOpDelta<T extends Template>(Entity: { new(): T; }): IEntityDelta<T> {
  return {
    oldEntity: (EMPTY_OBJECT as T),
    newEntity: (EMPTY_OBJECT as T),
    type: EntityDeltaType.noop,
  }
}

export function isNoOpDelta(delta: IEntityDelta<Template>): boolean {
  // any time no change is required
  //   which also applies to the 'noop' EntityDeltaType
  return (! isDirtyDelta(delta));
}


export function mutateDelta<T extends Template>(delta: IEntityDelta<T>, changes: Record<string, any>): IEntityDelta<T> {
  // apply updates directly to the Entity
  //   eg. mutate in-place
  delta.newEntity = Object.assign(delta.newEntity, changes);
  return delta;
}

// supports create, update and delete
export async function saveDelta<T extends Template>(delta: IEntityDelta<T>, repository: Repository<T>): Promise<IEntityDelta<T>> {
  if (! isDirtyDelta(delta)) {
    // so what's to save?
    return delta;
  }

  if (isDeleteDelta(delta)) {
    const entity = delta.oldEntity;
    await repository.remove(entity);
    return delta;
  }

  // save the Entity and update it to the post-save state
  const entity = (<unknown>delta.newEntity as DeepPartial<T>);
  delta.newEntity = await repository.save(entity);
  return delta;
}


export function primaryEntityOfDelta<T extends Template>(delta: IEntityDelta<T>): T {
  switch (delta.type) {
    case EntityDeltaType.noop:
      throw new Error('a noop delta has no primary Entity');
    case EntityDeltaType.delete:
      return delta.oldEntity;
    default:
      return delta.newEntity; // also the mutable Entity
  }
}

export function deriveIsDirtyFlagsFromDelta(delta: IEntityDelta<Template>): Record<string, boolean> {
  const { type } = delta;
  if (delta.type === EntityDeltaType.noop) {
    return EMPTY_OBJECT;
  }

  const oldEntity: Record<string, any> = delta.oldEntity;
  const newEntity: Record<string, any> = delta.newEntity;
  const keys = Array.from(new Set( // eg. distinct
    Object.keys(oldEntity).concat( Object.keys(newEntity) )
  ));

  // a simple Object providing `true` for each modified property
  return keys.reduce((reduced: Record<string, boolean>, key) => {
    if (oldEntity[key] !== newEntity[key]) {
      reduced[key] = true;
    }
    return reduced;
  }, {});
}

export function isDirtyDelta(delta: IEntityDelta<Template>): boolean {
  const isDirty = deriveIsDirtyFlagsFromDelta(delta);

  return Object.keys(isDirty).some((key) => (isDirty[key] === true));
}
