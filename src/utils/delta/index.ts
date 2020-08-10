import { Repository, DeepPartial } from 'typeorm';

import { ModelTemplate, ModelTemplateClass } from '../../templates/model.template';


const EMPTY_OBJECT = Object.freeze({});

export enum ModelDeltaType {
  noop = 'noop',
  create = 'create',
  update = 'update',
  delete = 'delete',
}
export interface IModelDelta<T extends ModelTemplate> {
  oldModel: T;
  newModel: T;
  type: ModelDeltaType;
}


export function buildSnapshotDelta<T extends ModelTemplate>(model: T): IModelDelta<T> {
  // take a snapshot
  //   "Using Class Types in Generics"
  //   https://www.typescriptlang.org/docs/handbook/generics.html#using-class-types-in-generics
  const Model = (model.constructor as ModelTemplateClass<T>);
  const oldModel = Object.assign(new Model(), model);

  return {
    oldModel, // a snapshot
    newModel: model, // the model to be mutated
    type: ModelDeltaType.update,
  }
}

export function buildCreateDelta<T extends ModelTemplate>(model: T): IModelDelta<T> {
  return {
    oldModel: (EMPTY_OBJECT as T), // it didn't exist before; *everything* has changed
    newModel: model, // the model to be mutated
    type: ModelDeltaType.create,
  }
}

export function isCreateDelta(delta: IModelDelta<ModelTemplate>): boolean {
  return (delta.type === ModelDeltaType.create);
}

export function buildDeleteDelta<T extends ModelTemplate>(model: T): IModelDelta<T> {
  return {
    oldModel: model, // current state
    newModel: (EMPTY_OBJECT as T), // it no longer exists; *everything* has changed
    type: ModelDeltaType.delete,
  }
}

export function isDeleteDelta(delta: IModelDelta<ModelTemplate>): boolean {
  return (delta.type === ModelDeltaType.delete);
}

export function buildNoOpDelta<T extends ModelTemplate>(Model: ModelTemplateClass<T>): IModelDelta<T> {
  return {
    oldModel: (EMPTY_OBJECT as T),
    newModel: (EMPTY_OBJECT as T),
    type: ModelDeltaType.noop,
  }
}

export function isNoOpDelta(delta: IModelDelta<ModelTemplate>): boolean {
  // any time no change is required
  //   which also applies to the 'noop' ModelDeltaType
  return (! isDirtyDelta(delta));
}


export function shallowCloneDelta<T extends ModelTemplate>(delta: IModelDelta<T>): IModelDelta<T> {
  // for node < 8.6, @see https://node.green/
  return Object.assign({}, delta, { newModel: Object.assign({}, delta.newModel) });
}

export function mutateDelta<T extends ModelTemplate>(delta: IModelDelta<T>, changes: Record<string, any>): IModelDelta<T> {
  // apply updates directly to the Model
  //   eg. mutate in-place
  delta.newModel = Object.assign(delta.newModel, changes);
  return delta;
}

// supports create, update and delete
export async function saveDelta<T extends ModelTemplate>(delta: IModelDelta<T>, repository: Repository<T>): Promise<IModelDelta<T>> {
  if (! isDirtyDelta(delta)) {
    // so what's to save?
    return delta;
  }

  if (isDeleteDelta(delta)) {
    const model = delta.oldModel;
    await repository.remove(model);
    return delta;
  }

  // save the Model and update it to the post-save state
  const model = (<unknown>delta.newModel as DeepPartial<T>);
  delta.newModel = await repository.save(model);
  return delta;
}


export function primaryModelOfDelta<T extends ModelTemplate>(delta: IModelDelta<T>): T {
  switch (delta.type) {
    case ModelDeltaType.noop:
      throw new Error('a noop delta has no primary Model');
    case ModelDeltaType.delete:
      return delta.oldModel;
    default:
      return delta.newModel; // also the mutable Model
  }
}

export function deriveIsDirtyFlagsFromDelta(delta: IModelDelta<ModelTemplate>): Record<string, boolean> {
  const { type } = delta;
  if (delta.type === ModelDeltaType.noop) {
    return EMPTY_OBJECT;
  }

  const oldModel: Record<string, any> = delta.oldModel;
  const newModel: Record<string, any> = delta.newModel;
  const keys = Array.from(new Set( // eg. distinct
    Object.keys(oldModel).concat( Object.keys(newModel) )
  ));

  // a simple Object providing `true` for each modified property
  return keys.reduce((reduced: Record<string, boolean>, key) => {
    if (oldModel[key] !== newModel[key]) {
      reduced[key] = true;
    }
    return reduced;
  }, {});
}

export function isDirtyDelta(delta: IModelDelta<ModelTemplate>): boolean {
  const isDirty = deriveIsDirtyFlagsFromDelta(delta);

  return Object.keys(isDirty).some((key) => (isDirty[key] === true));
}
