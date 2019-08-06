import { pick, difference } from 'lodash';

import { ModelTemplate } from '../templates/model.template';


export interface IModelReorderArgs {
  targetId: string;
  // one and only one of:
  beforeId?: string;
  toLast?: boolean;
  // one and only one of:
  afterId?: string;
  toFirst?: boolean;
}

export interface IModelReorderNeighbors<T> extends IModelReorderArgs {
  target: T;
  before: T | null;
  toLast: boolean;
  after: T | null;
  toFirst: boolean;
}

export interface IModelReorderBisection<T> {
  target: T;
  targetIndex: number,
  befores: T[];
  afters: T[];
}

/**
 * This method also validates.
 * And you'll need your neighbors to make calls to other methods.
 */
export function deriveModelReorderNeighbors<T extends ModelTemplate>(
  models: T[],
  args: IModelReorderArgs
): IModelReorderNeighbors<T> {
  let before: T | null | undefined = undefined;
  let after: T | null | undefined = undefined;

  // identify the Model to be reordered
  const { targetId } = args;
  const target: T | undefined = models.find((model: T) => (model.id === targetId));
  if (target === undefined) {
    throw new Error(`reorder operation cannot locate { targetId: "${ targetId }" }`);
  }

  // subsequent calculations are based upon all Models *except* the target
  //   given [ A, B, C ] + { targetId: B, beforeId: C, afterId: A }
  //   difference is [ A, C ], allowing A + C to be adjacent, and B to be reordered between them
  //   (yes, this reorder operation is a no-op, but it's a good example)
  const modelsWithoutTarget: T[] = difference(models, [ target ]);

  // identify the { before } Neighbor
  if (args.toLast) {
    before = null;
  }
  if (args.beforeId) {
    if (before !== undefined) {
      throw new Error(`reorder operation cannot specify both { beforeId: "${ args.beforeId }", toLast: true }`);
    }
    before = modelsWithoutTarget.find((model: T) => (model.id === args.beforeId)) || undefined;
  }
  if (before === undefined) {
    throw new Error(`reorder operation cannot locate { beforeId: "${ args.beforeId }" }`);
  }

  // identify the { after } Neighbor
  if (args.toFirst) {
    after = null;
  }
  if (args.afterId) {
    if (after !== undefined) {
      throw new Error(`reorder operation cannot specify both { afterId: "${ args.afterId }", toFirst: true }`);
    }
    after = modelsWithoutTarget.find(({ id }) => (id === args.afterId)) || undefined;
  }
  if (after === undefined) {
    throw new Error(`reorder operation cannot locate { afterId: "${ args.afterId }" }`);
  }

  // ensure Neighbors are currently adjacent
  if (before === null) {
    // reorder it to "first"
    if (after === null) {
      // AND reorder it to "last"; only possible for an empty Array
      if (modelsWithoutTarget.length !== 0) {
        throw new Error('reorder operation cannot reorder to first-and-last unless it only contains the target');
      }
    }
    else {
      // there should be no current Neighbor after the "after"
      const afterIndex = modelsWithoutTarget.indexOf(<T>after);
      if (afterIndex !== (modelsWithoutTarget.length - 1)) {
        throw new Error(`reorder operation expected { afterId: "${ args.afterId }" } to be the last Model`);
      }
    }
  }
  else {
    const beforeIndex = modelsWithoutTarget.indexOf(<T>before);
    if (after === null) {
      // reorder it to "first"; there should be no current Neighbor before the "before"
      if (beforeIndex !== 0) {
        throw new Error(`reorder operation expected { beforeId: "${ args.beforeId }" } to be the first Model`);
      }
    }
    else {
      // the two Neighbors must currently be adjacent for the new Model to be reordered between them
      const afterIndex = modelsWithoutTarget.indexOf(<T>after);
      if (afterIndex !== (beforeIndex - 1)) {
        throw new Error(`reorder operation expected { beforeId: "${ args.beforeId }", afterId: "${ args.afterId }" } to be adjacent`);
      }
    }
  }

  return {
    ...args, // a superset of IModelReorderArgs
    target: <T>target,
    before: <T | null>before,
    toLast: (before === null),
    after: <T | null>after,
    toFirst: (after === null),
  };
}

export function bisectReorderModels<T extends ModelTemplate>(
  models: T[],
  neighbors: IModelReorderNeighbors<T>
): IModelReorderBisection<T> {
  const { target, toFirst, after, afterId } = neighbors;
  const modelsWithoutTarget: T[] = difference(models, [ target ]);

  if (toFirst) {
    return {
      target,
      targetIndex: 0, // "first"
      befores: [],
      afters: modelsWithoutTarget,
    };
  }

  const afterIndex = modelsWithoutTarget.indexOf(<T>after);
  if (afterIndex === -1) {
    throw new Error(`reorder operation cannot locate { afterId: "${ afterId }" } for bisection`);
  }

  // and the target goes *after* that
  const targetIndex = afterIndex + 1;
  return {
    target,
    targetIndex,
    befores: modelsWithoutTarget.slice(0, targetIndex), // includes the { after }
    afters: modelsWithoutTarget.slice(targetIndex),
  };
}
