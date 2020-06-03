import 'jest';
import { ControllerTemplate } from './controller.template';
import { FakeModelWithIndex } from './fake.model';

const FAKE_MODELS = [
  Object.assign(new FakeModelWithIndex(), {
    id: '1',
    fakeData: 'FAKE_1',
  }),
  Object.assign(new FakeModelWithIndex(), {
    id: '2',
    fakeData: 'FAKE_2',
  }),
  Object.assign(new FakeModelWithIndex(), {
    id: '3',
    fakeData: 'FAKE_3',
  }),
];
const MAYBE_FAKE_MODELS = [
  null,
  FAKE_MODELS[1],
  undefined,
] as Array<FakeModelWithIndex>;


type LoaderKeys = 'byId' | 'byFakeId';
class FakeController extends ControllerTemplate<FakeModelWithIndex, LoaderKeys> {
  private indexCount: number = 0; // a new index is allocated for every fake Model we construct

  constructor() {
    super();

    this.loaders['byId'] = this.wrapQueryInDataLoader(async (ids: string[]) => {
      // fortunately there's no need to involve `typeorm` in this example;
      //   in-memory generated Models are plenty sufficient
      const fakeModels = ids.map((id) => {
        const index = ++this.indexCount;

        return Object.assign(new FakeModelWithIndex(), {
          id,
          index,
        });
      });
      return this.orderResultsByIds(ids, fakeModels);
    });

    this.loaders['byFakeId'] = this.wrapQueryInDataLoader(async (fakeIds: string[]) => {
      const fakeModels = fakeIds.map((fakeId) => {
        const index = ++this.indexCount;

        return Object.assign(new FakeModelWithIndex(), {
          id: fakeId, // will NOT collide with 'byId'
          fakeData: fakeId,
          index,
        });
      });
      return this.orderResultsByIds(fakeIds, fakeModels, 'fakeData');
    });
  }

  async getByIds(ids: string[]) {
    return this.loaders['byId'].loadMany(ids);
  }

  async getByFakeIds(fakeDatas: string[]) {
    return this.loaders['byFakeId'].loadMany(fakeDatas);
  }
}


describe('ControllerTemplate', () => {
  let controller: FakeController;

  beforeEach(() => {
    controller = new FakeController();
  });


  describe('with respect to DataLoaders', () => {
    it('returns Models in the order requested', async () => {
      const byIds = await controller.getByIds([ 'B', 'A', 'C' ]);
      expect(byIds.map((model) => model.id)).toEqual([ 'B', 'A', 'C' ]);

      const byFakeIds = await controller.getByFakeIds([ 'C', 'B', 'A' ]);
      expect(byFakeIds.map((model) => model.id)).toEqual([ 'C', 'B', 'A' ]);
    });

    it('only loads Models which it has not previously loaded', async () => {
      const byIds = await controller.getByIds([ 'A', 'B', 'C' ]);
      expect(byIds.map((model) => model.index)).toEqual([ 1, 2, 3 ]);

      const byIdsAgain = await controller.getByIds([ 'B', 'D', 'A', 'E', 'C' ]);
      expect(byIdsAgain.map((model) => model.index)).toEqual([ 2, 4, 1, 5, 3 ]);
    });

    it('has independent keyspaces for each DataLoader', async () => {
      const byIds = await controller.getByIds([ 'A', 'B', 'C' ]);
      expect(byIds.map((model) => model.index)).toEqual([ 1, 2, 3 ]);

      const byFakeIds = await controller.getByFakeIds([ 'C', 'B', 'A' ]);
      expect(byFakeIds.map((model) => model.index)).toEqual([ 4, 5, 6 ]);
    });
  });

  describe('orderResultsByIds', () => {
    it('should order results by ids', () => {
      const list1 = controller.orderResultsByIds(['1', '2', '3'], FAKE_MODELS);
      expect(list1).toEqual(FAKE_MODELS);
      const list2 = controller.orderResultsByIds(['3', '1', '2'], FAKE_MODELS);
      expect(list2).toEqual([ FAKE_MODELS[2], FAKE_MODELS[0], FAKE_MODELS[1] ]);
    });

    it('should order results by a custom JSON Path', () => {
      const list1 = controller.orderResultsByIds(['FAKE_1', 'FAKE_2', 'FAKE_3'], FAKE_MODELS, 'fakeData');
      expect(list1).toEqual(FAKE_MODELS);
      const list2 = controller.orderResultsByIds(['FAKE_3', 'FAKE_1', 'FAKE_2'], FAKE_MODELS, 'fakeData');
      expect(list2).toEqual([ FAKE_MODELS[2], FAKE_MODELS[0], FAKE_MODELS[1] ]);
    });

    it('is tolerant of unmatched ids', () => {
      const list1 = controller.orderResultsByIds(['1', '2', '3'], MAYBE_FAKE_MODELS);
      expect(list1).toEqual([ undefined, MAYBE_FAKE_MODELS[1], undefined ]);
      const list2 = controller.orderResultsByIds(['FAKE_3', 'FAKE_1', 'FAKE_2'], MAYBE_FAKE_MODELS, 'fakeData');
      expect(list2).toEqual([ undefined, undefined, MAYBE_FAKE_MODELS[1] ]);
    });
  });

  describe('orderResultsByDerivedId', () => {
    const idDeriver = ((model: FakeModelWithIndex) => (model && model.id));

    it('should order results by the derived id', () => {
      const list1 = controller.orderResultsByDerivedId(['1', '2', '3'], FAKE_MODELS, idDeriver);
      expect(list1).toEqual(FAKE_MODELS);
      const list2 = controller.orderResultsByDerivedId(['3', '1', '2'], FAKE_MODELS, idDeriver);
      expect(list2).toEqual([ FAKE_MODELS[2], FAKE_MODELS[0], FAKE_MODELS[1] ]);
    });

    it('is tolerant of unmatched ids', () => {
      const list1 = controller.orderResultsByDerivedId(['1', '2', '3'], MAYBE_FAKE_MODELS, idDeriver);
      expect(list1).toEqual([ undefined, MAYBE_FAKE_MODELS[1], undefined ]);
    });
  });

  describe('orderResultsByMatchingModel', () => {
    const modelDeriver = ((id: string, models: Array<FakeModelWithIndex>) => models[ (parseInt(id, 10) - 1) ]);

    it('should order results by derived Model', () => {
      const list1 = controller.orderResultsByMatchingModel(['1', '2', '3'], FAKE_MODELS, modelDeriver);
      expect(list1).toEqual(FAKE_MODELS);
      const list2 = controller.orderResultsByMatchingModel(['3', '1', '2'], FAKE_MODELS, modelDeriver);
      expect(list2).toEqual([ FAKE_MODELS[2], FAKE_MODELS[0], FAKE_MODELS[1] ]);
    });

    it('is tolerant of missing Models', () => {
      const list1 = controller.orderResultsByMatchingModel(['1', '2', '3'], MAYBE_FAKE_MODELS, modelDeriver);
      expect(list1).toEqual(MAYBE_FAKE_MODELS);
    });
  });

  describe('updateIndexOrder', () => {
    it('should return list if indexes are out of bounds', () => {
      const q1 = new FakeModelWithIndex();
      q1.id = '1';
      q1.index = 0;
      const q2  = new FakeModelWithIndex();
      q2.id = '2';
      q2.index = 1;
      const q3 = new FakeModelWithIndex();
      q3.id = '3';
      q3.index = 2;
      const q4 = new FakeModelWithIndex();
      q4.id = '4';
      q4.index = 3;
      const arrayOfStuff = [q1, q2, q3, q4];

      const sortedItems1 = controller.updateIndexOrder(arrayOfStuff, -1, 2);
      expect(sortedItems1).toEqual(arrayOfStuff);
      const sortedItems2 = controller.updateIndexOrder(arrayOfStuff, 1, -2);
      expect(sortedItems2).toEqual(arrayOfStuff);
      const sortedItems3 = controller.updateIndexOrder(arrayOfStuff, 1, 5);
      expect(sortedItems3).toEqual(arrayOfStuff);
      const sortedItems4 = controller.updateIndexOrder(arrayOfStuff, 6, 2);
      expect(sortedItems4).toEqual(arrayOfStuff);
    });

    it('should sort arrays and update the index property to the location in that array', () => {
      const testOneTravel1 = new FakeModelWithIndex();
      testOneTravel1.id = '1';
      testOneTravel1.index = 0;
      const testOneTravel2 = new FakeModelWithIndex();
      testOneTravel2.id = '2';
      testOneTravel2.index = 1;
      const testOneTravel3 = new FakeModelWithIndex();
      testOneTravel3.id = '3';
      testOneTravel3.index = 2;
      const testOneTravel4 = new FakeModelWithIndex();
      testOneTravel4.id = '4';
      testOneTravel4.index = 3;
      const arrayOfStuff1 = [testOneTravel1, testOneTravel2, testOneTravel3, testOneTravel4];
      const testTwoTravel1 = new FakeModelWithIndex();
      testTwoTravel1.id = '1';
      testTwoTravel1.index = 0;
      const testTwoTravel2 = new FakeModelWithIndex();
      testTwoTravel2.id = '2';
      testTwoTravel2.index = 1;
      const testThreeTravel3 = new FakeModelWithIndex();
      testThreeTravel3.id = '3';
      testThreeTravel3.index = 2;
      const testTwoTravel4 = new FakeModelWithIndex();
      testTwoTravel4.id = '4';
      testTwoTravel4.index = 3;
      const arrayOfStuff2 = [testTwoTravel1, testTwoTravel2, testThreeTravel3, testTwoTravel4];

      const sortedItems1 = controller.updateIndexOrder(arrayOfStuff1, 1, 2);
      expect(sortedItems1).toHaveLength(4);
      expect(sortedItems1[0].id).toEqual('1');
      expect(sortedItems1[0].index).toEqual(0);
      expect(sortedItems1[1].id).toEqual('3');
      expect(sortedItems1[1].index).toEqual(1);
      expect(sortedItems1[2].id).toEqual('2');
      expect(sortedItems1[2].index).toEqual(2);
      expect(sortedItems1[3].id).toEqual('4');
      expect(sortedItems1[3].index).toEqual(3);

      const sortedItems2 = controller.updateIndexOrder(arrayOfStuff2, 0, 3);
      expect(sortedItems2).toHaveLength(4);
      expect(sortedItems2[0].id).toEqual('2');
      expect(sortedItems2[0].index).toEqual(0);
      expect(sortedItems2[1].id).toEqual('3');
      expect(sortedItems2[1].index).toEqual(1);
      expect(sortedItems2[2].id).toEqual('4');
      expect(sortedItems2[2].index).toEqual(2);
      expect(sortedItems2[3].id).toEqual('1');
      expect(sortedItems2[3].index).toEqual(3);
    });
  });
});
