import * as TypeMoq from 'typemoq';
import { isEmpty } from 'lodash';
import { Repository } from 'typeorm';

import { ModelTemplate } from '../../templates/model.template';
import {
  ModelDeltaType,
  IModelDelta,

  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,

  shallowCloneDelta,
  mutateDelta,
  saveDelta,

  primaryModelOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,
} from './index';

class Model extends ModelTemplate {
  public value: string;

  public another: String;
  public added?: String;
}

const ORIGINAL = 'ORIGINAL';
const MUTATED = 'MUTATED';


describe('core/delta', () => {
  let model: Model;

  beforeEach(() => {
    // guaranteed fresh every time
    model = Object.assign(new Model(), {
      value: ORIGINAL,
    });
  });


  describe('buildSnapshotDelta', () => {
    it('builds a delta with a snapshot of the Model properties', () => {
      const delta = buildSnapshotDelta(model);
      const { oldModel, newModel } = delta;

      expect(oldModel).not.toBe(model);
      expect(oldModel).toBeInstanceOf(Model);
      expect(oldModel.value).toBe(ORIGINAL);

      expect(newModel).toBe(model);
      expect(delta.type).toEqual(ModelDeltaType.update);

      expect(isDirtyDelta(delta)).toBe(false);

      // it('provides an "old" state not impacted by Model mutation')
      model.value = MUTATED;

      expect(oldModel.value).toBe(ORIGINAL);

      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });
    });
  });

  describe('buildCreateDelta', () => {
    it('builds a delta whose old state is empty', () => {
      const delta = buildCreateDelta(model);
      const { oldModel, newModel } = delta;

      expect(oldModel).not.toBe(model);
      expect(oldModel).not.toBeInstanceOf(Model);
      expect(isEmpty(oldModel)).toBe(true);

      expect(newModel).toBe(model);
      expect(delta.type).toEqual(ModelDeltaType.create);

      // it('is dirty from the start')
      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });

      // it('provides an "old" state not impacted by Model mutation')x
      model.value = MUTATED;

      expect(oldModel.value).toBeUndefined();
    });
  });

  describe('isCreateDelta', () => {
    it('returns true for ModelDeltaType.create', () => {
      expect( isCreateDelta(buildCreateDelta(model)) ).toBe(true); // obviously

      expect( isCreateDelta(buildSnapshotDelta(model)) ).toBe(false);
      expect( isCreateDelta(buildDeleteDelta(model)) ).toBe(false);
      expect( isCreateDelta(buildNoOpDelta(Model)) ).toBe(false);
    });
  });

  describe('buildDeleteDelta', () => {
    it('builds a delta whose new state is empty', () => {
      const delta = buildDeleteDelta(model);
      const { oldModel, newModel } = delta;

      expect(oldModel).toBe(model);

      expect(newModel).not.toBe(model);
      expect(newModel).not.toBeInstanceOf(Model);
      expect(isEmpty(newModel)).toBe(true);

      expect(delta.type).toEqual(ModelDeltaType.delete);

      // it('is dirty from the start')
      expect(isDirtyDelta(delta)).toBe(true);

      // it('does not accept mutations to the "new" state')
      expect(() => {
        newModel.value = MUTATED;
      }).toThrow(/object is not extensible/);
      expect(() => {
        mutateDelta(delta, { value: MUTATED });
      }).toThrow(/object is not extensible/);
    });
  });

  describe('isDeleteDelta', () => {
    it('returns true for ModelDeltaType.delete', () => {
      expect( isDeleteDelta(buildDeleteDelta(model)) ).toBe(true); // obviously

      expect( isDeleteDelta(buildSnapshotDelta(model)) ).toBe(false);
      expect( isDeleteDelta(buildCreateDelta(model)) ).toBe(false);
      expect( isDeleteDelta(buildNoOpDelta(Model)) ).toBe(false);
    });
  });

  describe('buildNoOpDelta', () => {
    it('builds a delta with an empty state', () => {
      const delta = buildNoOpDelta(Model);
      const { oldModel, newModel } = delta;

      expect(oldModel).not.toBeInstanceOf(Model);
      expect(isEmpty(oldModel)).toBe(true);

      expect(newModel).not.toBeInstanceOf(Model);
      expect(isEmpty(newModel)).toBe(true);

      expect(delta.type).toEqual(ModelDeltaType.noop);
      expect(isDirtyDelta(delta)).toBe(false);

      // it('does not accept mutations to the state')
      expect(() => {
        oldModel.value = ORIGINAL;
      }).toThrow(/object is not extensible/);
      expect(() => {
        newModel.value = MUTATED;
      }).toThrow(/object is not extensible/);
      expect(() => {
        mutateDelta(delta, { value: MUTATED });
      }).toThrow(/object is not extensible/);
    });
  });

  describe('isNoOpDelta', () => {
    it('returns true for any delta which requires no changes', () => {
      expect( isNoOpDelta(buildNoOpDelta(Model)) ).toBe(true); // obviously

      expect( isNoOpDelta(buildCreateDelta(model)) ).toBe(false);
      expect( isNoOpDelta(buildDeleteDelta(model)) ).toBe(false);

      let delta = buildSnapshotDelta(model);
      expect( isNoOpDelta(delta) ).toBe(true);

      delta = mutateDelta(delta, {
        value: MUTATED,
      });
      expect( isNoOpDelta(delta) ).toBe(false);
    });
  });

  describe('shallowCloneDelta', () => {
    it('creates a delta with a shallow clone of the Model', () => {
      const delta = buildSnapshotDelta(model);
      expect(delta.newModel).toBe(model);

      const { oldModel, newModel } = shallowCloneDelta(delta);
      expect(newModel).not.toBe(delta.newModel);
      expect(newModel).toEqual(delta.newModel);

      expect(delta.oldModel.value).toBe(ORIGINAL);
      expect(oldModel.value).toBe(ORIGINAL);
      expect(delta.newModel.value).toBe(ORIGINAL);
      expect(newModel.value).toBe(ORIGINAL);

      // it('does not clone the old Model')
      //   it is a shared resource
      oldModel.value = 'OLD';
      newModel.value = 'NEW';

      expect(delta.oldModel.value).toBe('OLD');
      expect(oldModel.value).toBe('OLD');
      expect(delta.newModel.value).toBe(ORIGINAL);
      expect(newModel.value).toBe('NEW');
    });
  });

  describe('mutateDelta', () => {
    it('mutates the Model', () => {
      const delta = buildSnapshotDelta(model);
      expect(delta.newModel).toBe(model);

      const { oldModel, newModel } = mutateDelta(delta, {
        value: MUTATED,
      });

      expect(newModel).toBe(model);
      expect(oldModel.value).toBe(ORIGINAL);

      // it('mutates the Model in-place')
      expect(model.value).toBe(MUTATED);

      // it('mutates the delta passed to it')
      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });
    });
  });

  describe('saveDelta', () => {
    let repositoryMock: TypeMoq.IMock<Repository<Model>>;
    let repository: Repository<Model>;

    beforeEach(() => {
      repositoryMock = (<unknown>TypeMoq.Mock.ofType(Repository, TypeMoq.MockBehavior.Strict) as TypeMoq.IMock<Repository<Model>>);
      repository = repositoryMock.object;
    });
    afterEach(() => {
      repositoryMock.verifyAll();
    });

    it('updates the Model', async () => {
      // emulate Repository<T>#save => Promise<T>
      const saved: Model = Object.assign(new Model(), model);

      repositoryMock.setup((x) => x.save(TypeMoq.It.isAnyObject(Model)))
      .returns(() => Promise.resolve(saved))
      .verifiable(TypeMoq.Times.once());

      let delta = buildSnapshotDelta(model);
      expect(delta.newModel).toBe(model);
      expect(isDirtyDelta(delta)).toBe(false);

      delta = mutateDelta(delta, { value: MUTATED });
      expect(isDirtyDelta(delta)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual({
        value: true,
      });

      const { oldModel, newModel } = await saveDelta(delta, repository);

      // it('provides the post-save state')
      expect(newModel).not.toBe(model);
      expect(newModel).toBe(saved);

      // it('leaves the "old" state alone')
      expect(oldModel).toBe(delta.oldModel);

      // it('mutates the delta passed to it')
      expect(delta.newModel).toBe(saved);
      expect(isDirtyDelta(delta)).toBe(false);
    });

    it('does not save the Model unless it is dirty', async () => {
      const delta = buildSnapshotDelta(model);
      expect(isDirtyDelta(delta)).toBe(false);

      const { oldModel, newModel } = await saveDelta(delta, repository);
      expect(newModel).toBe(model);
    });

    it('creates an Model', async () => {
      // emulate Repository<T>#save => Promise<T>
      const saved: Model = Object.assign(new Model(), model);

      repositoryMock.setup((x) => x.save(TypeMoq.It.isAnyObject(Model)))
      .returns(() => Promise.resolve(saved))
      .verifiable(TypeMoq.Times.once());

      const delta = buildCreateDelta(model);
      const deltaDirtyFlags = deriveIsDirtyFlagsFromDelta(delta);
      expect(delta.newModel).toBe(model);

      const { oldModel, newModel } = await saveDelta(delta, repository);

      // it('provides the post-save state')
      expect(newModel).not.toBe(model);
      expect(newModel).toBe(saved);

      // it('leaves the "old" state alone')
      expect(oldModel).toEqual(delta.oldModel);

      // it('mutates the delta passed to it')
      expect(delta.newModel).toBe(saved);
      expect(isEmpty(delta.oldModel)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual(deltaDirtyFlags);
    });

    it('removes an Model', async () => {
      // emulate Repository<T>#remove => Promise<void>
      repositoryMock.setup((x) => x.remove(TypeMoq.It.isAnyObject(Model)))
      .returns(() => Promise.resolve(<unknown>null as Model))
      .verifiable(TypeMoq.Times.once());

      const delta = buildDeleteDelta(model);
      const deltaDirtyFlags = deriveIsDirtyFlagsFromDelta(delta);
      expect(delta.oldModel).toBe(model);

      const { oldModel, newModel } = await saveDelta(delta, repository);

      // it('leaves the state alone')
      expect(oldModel).toBe(model);
      expect(newModel).toEqual(delta.newModel);

      // it('does not mutate the delta passed to it')
      //   which is incidental; there's nothing to update ¯\_(ツ)_/¯
      expect(delta.oldModel).toBe(model);
      expect(isEmpty(delta.newModel)).toBe(true);
      expect(deriveIsDirtyFlagsFromDelta(delta)).toEqual(deltaDirtyFlags);
    });
  });

  describe('primaryModelOfDelta', () => {
    it('returns the primary Model of the delta', () => {
      expect(() => {
        return primaryModelOfDelta(buildNoOpDelta(Model));
      }).toThrow(/no primary Model/);

      expect( primaryModelOfDelta(buildSnapshotDelta(model)) ).toBe(model);
      expect( primaryModelOfDelta(buildCreateDelta(model)) ).toBe(model);
      expect( primaryModelOfDelta(buildDeleteDelta(model)) ).toBe(model);
    });
  });

  describe('deriveIsDirtyFlagsFromDelta', () => {
    it('expresses the changed properties of an Model', () => {
      model = Object.assign(new Model(), {
        value: ORIGINAL,
        another: 'ANOTHER',
      });

      const delta = buildSnapshotDelta(model);
      expect(delta.newModel).toBe(model);

      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({});

      // it('reflects the current state of the delta')
      model.value = MUTATED;
      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({
        value: true,
      });

      model.value = ORIGINAL;
      model.another = MUTATED;
      model.added = 'ADDED';
      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({
        another: true,
        added: true,
      });
    });

    it('treats a no-op as clean even if there are changes', () => {
      const delta = buildNoOpDelta(Model);
      delta.newModel = ({ value: MUTATED } as Model);
      expect(delta.newModel.value).not.toEqual(delta.oldModel.value);

      expect( deriveIsDirtyFlagsFromDelta(delta) ).toEqual({});
    });
  });

  describe('isDirtyDelta', () => {
    it('returns true if any property of an Model has changed', () => {
      const delta = buildSnapshotDelta(model);
      expect(delta.newModel).toBe(model);

      expect(isDirtyDelta(delta)).toBe(false);

      // it('reflects the current state of the delta')
      model.value = MUTATED;
      expect(isDirtyDelta(delta)).toBe(true);

      model.value = ORIGINAL;
      expect(isDirtyDelta(delta)).toBe(false);
    });

    it('treats a no-op as clean even if there are changes', () => {
      const delta = buildNoOpDelta(Model);
      delta.newModel = ({ value: MUTATED } as Model);
      expect(delta.newModel.value).not.toEqual(delta.oldModel.value);

      expect(isDirtyDelta(delta)).toBe(false);
    });
  });
});
