import 'jest';
import { ModelTemplate } from '../templates/model.template';
import {
  IModelReorderArgs,
  IModelReorderNeighbors,
  IModelReorderBisection,

  deriveModelReorderNeighbors,
  bisectReorderModels,

} from './reorder';

class Model extends ModelTemplate {
}

const target = Object.assign(new Model(), { id: 'target' });
const modelA = Object.assign(new Model(), { id: 'A' });
const modelB = Object.assign(new Model(), { id: 'B' });
const modelC = Object.assign(new Model(), { id: 'C' });


describe('core/reorder', () => {
  describe('deriveModelReorderNeighbors', () => {
    it('validates a reordering to between new neighbors', () => {
      const neighbors = deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
        targetId: 'target',
        beforeId: 'B',
        afterId: 'A',
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        beforeId: 'B',
        before: modelB,
        toLast: false,
        afterId: 'A',
        after: modelA,
        toFirst: false,
      });
    });

    it('validates a reordering to first', () => {
      const neighbors = deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
        targetId: 'target',
        beforeId: 'A',
        toFirst: true,
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        beforeId: 'A',
        before: modelA,
        toLast: false,
        after: null,
        toFirst: true,
      });
    });

    it('validates a reordering to last', () => {
      const neighbors = deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
        targetId: 'target',
        toLast: true,
        afterId: 'C',
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        before: null,
        toLast: true,
        afterId: 'C',
        after: modelC,
        toFirst: false,
      });
    });

    it('validates a reordering which is ultimately a no-op', () => {
      const neighbors = deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
        targetId: 'target',
        beforeId: 'C',
        afterId: 'B',
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        beforeId: 'C',
        before: modelC,
        toLast: false,
        afterId: 'B',
        after: modelB,
        toFirst: false,
      });
    });

    it('validates a reordering into an Array which is empty except for the target', () => {
      // which is another no-op variant
      const neighbors = deriveModelReorderNeighbors([ target ], {
        targetId: 'target',
        toLast: true,
        toFirst: true,
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        before: null,
        toLast: true,
        after: null,
        toFirst: true,
      });
    });

    it('requires the target to be in the Model Array', () => {
      expect(() => {
        return deriveModelReorderNeighbors([], {
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
        });
      }).toThrow(/cannot locate { targetId: "target" }/);
    });

    it('requires { before } to be in the Model Array', () => {
      expect(() => {
        return deriveModelReorderNeighbors([ modelA, modelB, target ], { // <= no modelC
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
        });
      }).toThrow(/cannot locate { beforeId: "C" }/);
    });

    it('rejects a conflict when determining the { before } Model', () => {
      expect(() => {
        return deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
          targetId: 'target',
          beforeId: 'C',
          toLast: true,
          afterId: 'B',
        });
      }).toThrow(/cannot specify both { beforeId: "C", toLast: true }/);
    });

    it('requires { after } to be in the Model Array', () => {
      expect(() => {
        return deriveModelReorderNeighbors([ modelA, target, modelC ], { // <= no modelB
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
        });
      }).toThrow(/cannot locate { afterId: "B" }/);
    });

    it('rejects a conflict when determining the { after } Model', () => {
      expect(() => {
        return deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
          toFirst: true,
        });
      }).toThrow(/cannot specify both { afterId: "B", toFirst: true }/);
    });

    it('rejects a reordering to between non-adjacent neighbors', () => {
      expect(() => {
        return deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
          targetId: 'target',
          beforeId: 'C',
          afterId: 'A',
        });
      }).toThrow(/expected { beforeId: "C", afterId: "A" } to be adjacent/);

      expect(() => {
        return deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
          targetId: 'target',
          beforeId: 'B',
          toFirst: true,
        });
      }).toThrow(/{ beforeId: "B" } to be the first Model/);

      expect(() => {
        return deriveModelReorderNeighbors([ modelA, modelB, target, modelC ], {
          targetId: 'target',
          toLast: true,
          afterId: 'B',
        });
      }).toThrow(/{ afterId: "B" } to be the last Model/);
    });

    it('rejects a first-and-last reordering unless the Array is empty except for the target', () => {
      expect(() => {
        return deriveModelReorderNeighbors([ modelA, target ], {
          targetId: 'target',
          toLast: true,
          toFirst: true,
        });
      }).toThrow(/cannot reorder to first-and-last/);
    });
  });


  describe('bisectReorderModels', () => {
    const MODELS = [ modelA, modelB, target, modelC ];

    it('bisects when the target should be first', () => {
      const neighbors = deriveModelReorderNeighbors(MODELS, {
        targetId: 'target',
        beforeId: 'A',
        toFirst: true,
      });

      expect(bisectReorderModels(MODELS, neighbors)).toEqual({
        target,
        targetIndex: 0,
        befores: [],
        afters: [ modelA, modelB, modelC ],
      });
    });

    it('bisects when the target should be last', () => {
      const neighbors = deriveModelReorderNeighbors(MODELS, {
        targetId: 'target',
        toLast: true,
        afterId: 'C',
      });

      expect(bisectReorderModels(MODELS, neighbors)).toEqual({
        target,
        targetIndex: 3,
        befores: [ modelA, modelB, modelC ],
        afters: [],
      });
    });

    it('bisects when the target should be reordering to between new neighbors', () => {
      const neighbors = deriveModelReorderNeighbors(MODELS, {
        targetId: 'target',
        beforeId: 'B',
        afterId: 'A',
      });

      expect(bisectReorderModels(MODELS, neighbors)).toEqual({
        target,
        targetIndex: 1,
        befores: [ modelA ],
        afters: [ modelB, modelC ],
      });
    });

    it('must be able to find the { after } Model', () => {
      const neighbors = deriveModelReorderNeighbors(MODELS, {
        targetId: 'target',
        beforeId: 'B',
        afterId: 'A',
      });

      expect(() => {
        return bisectReorderModels([ modelB, target, modelC ], neighbors); // <= no modelA
      }).toThrow(/cannot locate { afterId: "A" }/);
    });
  });
});
