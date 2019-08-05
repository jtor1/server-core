import 'jest';
import * as TypeMoq from 'typemoq';
import { noop, isEmpty } from 'lodash';
import { Repository } from 'typeorm';

import { Template } from '../templates/entity.template';
import {
  EntityDeltaType,
  IEntityDelta,

  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,

  mutateDelta,
  saveDelta,

  primaryEntityOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,
} from './delta';

class Entity extends Template {
  public value: string;

  public another: String;
  public added?: String;
}

const ORIGINAL = 'ORIGINAL';
const MUTATED = 'MUTATED';


describe('core/delta', () => {
  let entity: Entity;

  beforeEach(() => {
    // guaranteed fresh every time
    entity = Object.assign(new Entity(), {
      value: ORIGINAL,
    });
  });


  describe('buildSnapshotDelta', () => {
    it('builds a delta with a snapshot of the Entity properties', () => {
      const delta = buildSnapshotDelta(entity);
      const { oldEntity, newEntity } = delta;

      expect(oldEntity).not.toBe(entity);
      expect(oldEntity).toBeInstanceOf(Entity);
      expect(oldEntity.value).toBe(ORIGINAL);

      expect(newEntity).toBe(entity);
      expect(delta.type).toEqual(EntityDeltaType.update);

      expect(isDirtyDelta(delta)).toBe(false);

      // it('provides an "old" state not impacted by Entity mutation')
      entity.value = MUTATED;

      expect(oldEntity.value).toBe(ORIGINAL);

      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });
    });
  });

  describe('buildCreateDelta', () => {
    it('builds a delta whose old state is empty', () => {
      const delta = buildCreateDelta(entity);
      const { oldEntity, newEntity } = delta;

      expect(oldEntity).not.toBe(entity);
      expect(oldEntity).not.toBeInstanceOf(Entity);
      expect(isEmpty(oldEntity)).toBe(true);

      expect(newEntity).toBe(entity);
      expect(delta.type).toEqual(EntityDeltaType.create);

      // it('is dirty from the start')
      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });

      // it('provides an "old" state not impacted by Entity mutation')x
      entity.value = MUTATED;

      expect(oldEntity.value).toBeUndefined();
    });
  });

  describe('isCreateDelta', () => {
    it('returns true for EntityDeltaType.create', () => {
      expect( isCreateDelta(buildCreateDelta(entity)) ).toBe(true); // obviously

      expect( isCreateDelta(buildSnapshotDelta(entity)) ).toBe(false);
      expect( isCreateDelta(buildDeleteDelta(entity)) ).toBe(false);
      expect( isCreateDelta(buildNoOpDelta(Entity)) ).toBe(false);
    });
  });

  describe('buildDeleteDelta', () => {
    it('builds a delta whose new state is empty', () => {
      const delta = buildDeleteDelta(entity);
      const { oldEntity, newEntity } = delta;

      expect(oldEntity).toBe(entity);

      expect(newEntity).not.toBe(entity);
      expect(newEntity).not.toBeInstanceOf(Entity);
      expect(isEmpty(newEntity)).toBe(true);

      expect(delta.type).toEqual(EntityDeltaType.delete);

      // it('is dirty from the start')
      expect(isDirtyDelta(delta)).toBe(true);

      // it('does not accept mutations to the "new" state')
      expect(() => {
        newEntity.value = MUTATED;
      }).toThrow(/object is not extensible/);
      expect(() => {
        mutateDelta(delta, { value: MUTATED });
      }).toThrow(/object is not extensible/);
    });
  });

  describe('isDeleteDelta', () => {
    it('returns true for EntityDeltaType.delete', () => {
      expect( isDeleteDelta(buildDeleteDelta(entity)) ).toBe(true); // obviously

      expect( isDeleteDelta(buildSnapshotDelta(entity)) ).toBe(false);
      expect( isDeleteDelta(buildCreateDelta(entity)) ).toBe(false);
      expect( isDeleteDelta(buildNoOpDelta(Entity)) ).toBe(false);
    });
  });

  describe('buildNoOpDelta', () => {
    it('builds a delta with an empty state', () => {
      const delta = buildNoOpDelta(Entity);
      const { oldEntity, newEntity } = delta;

      expect(oldEntity).not.toBeInstanceOf(Entity);
      expect(isEmpty(oldEntity)).toBe(true);

      expect(newEntity).not.toBeInstanceOf(Entity);
      expect(isEmpty(newEntity)).toBe(true);

      expect(delta.type).toEqual(EntityDeltaType.noop);
      expect(isDirtyDelta(delta)).toBe(false);

      // it('does not accept mutations to the state')
      expect(() => {
        oldEntity.value = ORIGINAL;
      }).toThrow(/object is not extensible/);
      expect(() => {
        newEntity.value = MUTATED;
      }).toThrow(/object is not extensible/);
      expect(() => {
        mutateDelta(delta, { value: MUTATED });
      }).toThrow(/object is not extensible/);
    });
  });

  describe('isNoOpDelta', () => {
    it('returns true for any delta which requires no changes', () => {
      expect( isNoOpDelta(buildNoOpDelta(Entity)) ).toBe(true); // obviously

      expect( isNoOpDelta(buildCreateDelta(entity)) ).toBe(false);
      expect( isNoOpDelta(buildDeleteDelta(entity)) ).toBe(false);

      let delta = buildSnapshotDelta(entity);
      expect( isNoOpDelta(delta) ).toBe(true);

      delta = mutateDelta(delta, {
        value: MUTATED,
      });
      expect( isNoOpDelta(delta) ).toBe(false);
    });
  });

  describe('mutateDelta', () => {
    it('mutates the Entity', () => {
      const delta = buildSnapshotDelta(entity);
      expect(delta.newEntity).toBe(entity);

      const { oldEntity, newEntity } = mutateDelta(delta, {
        value: MUTATED,
      });

      expect(newEntity).toBe(entity);
      expect(oldEntity.value).toBe(ORIGINAL);

      // it('mutates the Entity in-place')
      expect(entity.value).toBe(MUTATED);

      // it('mutates the delta passed to it')
      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });
    });
  });

  describe('saveDelta', () => {
    let repositoryMock: TypeMoq.IMock<Repository<Entity>>;
    let repository: Repository<Entity>;

    beforeEach(() => {
      repositoryMock = (<unknown>TypeMoq.Mock.ofType(Repository, TypeMoq.MockBehavior.Strict) as TypeMoq.IMock<Repository<Entity>>);
      repository = repositoryMock.object;
    });
    afterEach(() => {
      repositoryMock.verifyAll();
    });

    it('updates the Entity', async () => {
      // emulate Repository<T>#save => Promise<T>
      const saved: Entity = Object.assign(new Entity(), entity);

      repositoryMock.setup((x) => x.save(TypeMoq.It.isAnyObject(Entity)))
      .returns(() => Promise.resolve(saved))
      .verifiable(TypeMoq.Times.once());

      let delta = buildSnapshotDelta(entity);
      expect(delta.newEntity).toBe(entity);
      expect(isDirtyDelta(delta)).toBe(false);

      delta = mutateDelta(delta, { value: MUTATED });
      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });

      const { oldEntity, newEntity } = await saveDelta(delta, repository);

      // it('provides the post-save state')
      expect(newEntity).not.toBe(entity);
      expect(newEntity).toBe(saved);

      // it('leaves the "old" state alone')
      expect(oldEntity).toBe(delta.oldEntity);

      // it('mutates the delta passed to it')
      expect(delta.newEntity).toBe(saved);
      expect(isDirtyDelta(delta)).toBe(false);
    });

    it('does not save the Entity unless it is dirty', async () => {
      const delta = buildSnapshotDelta(entity);
      expect(isDirtyDelta(delta)).toBe(false);

      const { oldEntity, newEntity } = await saveDelta(delta, repository);
      expect(newEntity).toBe(entity);
    });

    it('creates an Entity', async () => {
      // emulate Repository<T>#save => Promise<T>
      const saved: Entity = Object.assign(new Entity(), entity);

      repositoryMock.setup((x) => x.save(TypeMoq.It.isAnyObject(Entity)))
      .returns(() => Promise.resolve(saved))
      .verifiable(TypeMoq.Times.once());

      const delta = buildCreateDelta(entity);
      const deltaDirtyFlags = deriveIsDirtyFlagsFromDelta(delta);
      expect(delta.newEntity).toBe(entity);

      const { oldEntity, newEntity } = await saveDelta(delta, repository);

      // it('provides the post-save state')
      expect(newEntity).not.toBe(entity);
      expect(newEntity).toBe(saved);

      // it('leaves the "old" state alone')
      expect(oldEntity).toEqual(delta.oldEntity);

      // it('mutates the delta passed to it')
      expect(delta.newEntity).toBe(saved);
      expect(isEmpty(delta.oldEntity)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual(deltaDirtyFlags);
    });

    it('removes an Entity', async () => {
      // emulate Repository<T>#remove => Promise<void>
      repositoryMock.setup((x) => x.remove(TypeMoq.It.isAnyObject(Entity)))
      .returns(() => Promise.resolve(<unknown>null as Entity))
      .verifiable(TypeMoq.Times.once());

      const delta = buildDeleteDelta(entity);
      const deltaDirtyFlags = deriveIsDirtyFlagsFromDelta(delta);
      expect(delta.oldEntity).toBe(entity);

      const { oldEntity, newEntity } = await saveDelta(delta, repository);

      // it('leaves the state alone')
      expect(oldEntity).toBe(entity);
      expect(newEntity).toEqual(delta.newEntity);

      // it('does not mutate the delta passed to it')
      //   which is incidental; there's nothing to update ¯\_(ツ)_/¯
      expect(delta.oldEntity).toBe(entity);
      expect(isEmpty(delta.newEntity)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual(deltaDirtyFlags);
    });
  });

  describe('primaryEntityOfDelta', () => {
    it('returns the primary Entity of the delta', () => {
      expect(() => {
        return primaryEntityOfDelta(buildNoOpDelta(Entity));
      }).toThrow(/no primary Entity/);

      expect( primaryEntityOfDelta(buildSnapshotDelta(entity)) ).toBe(entity);
      expect( primaryEntityOfDelta(buildCreateDelta(entity)) ).toBe(entity);
      expect( primaryEntityOfDelta(buildDeleteDelta(entity)) ).toBe(entity);
    });
  });

  describe('deriveIsDirtyFlagsFromDelta', () => {
    it('expresses the changed properties of an Entity', () => {
      entity = Object.assign(new Entity(), {
        value: ORIGINAL,
        another: 'ANOTHER',
      });

      const delta = buildSnapshotDelta(entity);
      expect(delta.newEntity).toBe(entity);

      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({});

      // it('reflects the current state of the delta')
      entity.value = MUTATED;
      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({
        value: true,
      });

      entity.value = ORIGINAL;
      entity.another = MUTATED;
      entity.added = 'ADDED';
      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({
        another: true,
        added: true,
      });
    });

    it('treats a no-op as clean even if there are changes', () => {
      const delta = buildNoOpDelta(Entity);
      delta.newEntity = ({ value: MUTATED } as Entity);
      expect(delta.newEntity.value).not.toEqual(delta.oldEntity.value);

      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({});
    });
  });

  describe('isDirtyDelta', () => {
    it('returns true if any property of an Entity has changed', () => {
      const delta = buildSnapshotDelta(entity);
      expect(delta.newEntity).toBe(entity);

      expect(isDirtyDelta(delta)).toBe(false);

      // it('reflects the current state of the delta')
      entity.value = MUTATED;
      expect(isDirtyDelta(delta)).toBe(true);

      entity.value = ORIGINAL;
      expect(isDirtyDelta(delta)).toBe(false);
    });

    it('treats a no-op as clean even if there are changes', () => {
      const delta = buildNoOpDelta(Entity);
      delta.newEntity = ({ value: MUTATED } as Entity);
      expect(delta.newEntity.value).not.toEqual(delta.oldEntity.value);

      expect(isDirtyDelta(delta)).toBe(false);
    });
  });
});
