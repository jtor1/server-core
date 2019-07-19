import 'jest';
import { Template } from '../templates/entity.template';
import {
  IEntityReorderArgs,
  IEntityReorderNeighbors,
  IEntityReorderBisection,

  deriveEntityReorderNeighbors,
  bisectReorderEntities,

} from './reorder';

class Entity extends Template {
}

const target = Object.assign(new Entity(), { id: 'target' });
const entityA = Object.assign(new Entity(), { id: 'A' });
const entityB = Object.assign(new Entity(), { id: 'B' });
const entityC = Object.assign(new Entity(), { id: 'C' });


describe('core/reorder', () => {
  describe('deriveEntityReorderNeighbors', () => {
    it('validates a reordering to between new neighbors', () => {
      const neighbors = deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
        targetId: 'target',
        beforeId: 'B',
        afterId: 'A',
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        beforeId: 'B',
        before: entityB,
        toLast: false,
        afterId: 'A',
        after: entityA,
        toFirst: false,
      });
    });

    it('validates a reordering to first', () => {
      const neighbors = deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
        targetId: 'target',
        beforeId: 'A',
        toFirst: true,
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        beforeId: 'A',
        before: entityA,
        toLast: false,
        after: null,
        toFirst: true,
      });
    });

    it('validates a reordering to last', () => {
      const neighbors = deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
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
        after: entityC,
        toFirst: false,
      });
    });

    it('validates a reordering which is ultimately a no-op', () => {
      const neighbors = deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
        targetId: 'target',
        beforeId: 'C',
        afterId: 'B',
      });

      expect(neighbors).toEqual({
        targetId: 'target',
        target,
        beforeId: 'C',
        before: entityC,
        toLast: false,
        afterId: 'B',
        after: entityB,
        toFirst: false,
      });
    });

    it('validates a reordering into an Array which is empty except for the target', () => {
      // which is another no-op variant
      const neighbors = deriveEntityReorderNeighbors([ target ], {
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

    it('requires the target to be in the Entity Array', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([], {
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
        });
      }).toThrow(/cannot locate { targetId: "target" }/);
    });

    it('requires { before } to be in the Entity Array', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, entityB, target ], { // <= no entityC
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
        });
      }).toThrow(/cannot locate { beforeId: "C" }/);
    });

    it('rejects a conflict when determining the { before } Entity', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
          targetId: 'target',
          beforeId: 'C',
          toLast: true,
          afterId: 'B',
        });
      }).toThrow(/cannot specify both { beforeId: "C", toLast: true }/);
    });

    it('requires { after } to be in the Entity Array', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, target, entityC ], { // <= no entityB
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
        });
      }).toThrow(/cannot locate { afterId: "B" }/);
    });

    it('rejects a conflict when determining the { after } Entity', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
          targetId: 'target',
          beforeId: 'C',
          afterId: 'B',
          toFirst: true,
        });
      }).toThrow(/cannot specify both { afterId: "B", toFirst: true }/);
    });

    it('rejects a reordering to between non-adjacent neighbors', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
          targetId: 'target',
          beforeId: 'C',
          afterId: 'A',
        });
      }).toThrow(/expected { beforeId: "C", afterId: "A" } to be adjacent/);

      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
          targetId: 'target',
          beforeId: 'B',
          toFirst: true,
        });
      }).toThrow(/{ beforeId: "B" } to be the first Entity/);

      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, entityB, target, entityC ], {
          targetId: 'target',
          toLast: true,
          afterId: 'B',
        });
      }).toThrow(/{ afterId: "B" } to be the last Entity/);
    });

    it('rejects a first-and-last reordering unless the Array is empty except for the target', () => {
      expect(() => {
        return deriveEntityReorderNeighbors([ entityA, target ], {
          targetId: 'target',
          toLast: true,
          toFirst: true,
        });
      }).toThrow(/cannot reorder to first-and-last/);
    });
  });


  describe('bisectReorderEntities', () => {
    const ENTITIES = [ entityA, entityB, target, entityC ];

    it('bisects when the target should be first', () => {
      const neighbors = deriveEntityReorderNeighbors(ENTITIES, {
        targetId: 'target',
        beforeId: 'A',
        toFirst: true,
      });

      expect(bisectReorderEntities(ENTITIES, neighbors)).toEqual({
        target,
        targetIndex: 0,
        befores: [],
        afters: [ entityA, entityB, entityC ],
      });
    });

    it('bisects when the target should be last', () => {
      const neighbors = deriveEntityReorderNeighbors(ENTITIES, {
        targetId: 'target',
        toLast: true,
        afterId: 'C',
      });

      expect(bisectReorderEntities(ENTITIES, neighbors)).toEqual({
        target,
        targetIndex: 3,
        befores: [ entityA, entityB, entityC ],
        afters: [],
      });
    });

    it('bisects when the target should be reordering to between new neighbors', () => {
      const neighbors = deriveEntityReorderNeighbors(ENTITIES, {
        targetId: 'target',
        beforeId: 'B',
        afterId: 'A',
      });

      expect(bisectReorderEntities(ENTITIES, neighbors)).toEqual({
        target,
        targetIndex: 1,
        befores: [ entityA ],
        afters: [ entityB, entityC ],
      });
    });

    it('must be able to find the { after } Entity', () => {
      const neighbors = deriveEntityReorderNeighbors(ENTITIES, {
        targetId: 'target',
        beforeId: 'B',
        afterId: 'A',
      });

      expect(() => {
        return bisectReorderEntities([ entityB, target, entityC ], neighbors); // <= no entityA
      }).toThrow(/cannot locate { afterId: "A" }/);
    });
  });
});
