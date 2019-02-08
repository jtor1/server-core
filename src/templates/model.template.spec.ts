import 'jest';
import * as TypeMoq from 'typemoq';

// import { Template } from './entity.template';
import { EntityModelTemplate } from './model.template';
// import { Column, Entity } from 'typeorm';
import { FakeEntity } from './fake.entity';
// import { Context } from './context';
// import { Vendor } from '../entity/vendor';
// import { EventTravel } from '../entity/event.travel';
// import { SurveyQuestion } from '../entity/survey/question';

// const contextMock: TypeMoq.IMock<Context> = TypeMoq.Mock.ofType(Context);

describe(' EntityModelTemplate<T>', () => {

  describe('getEntity', () => {
    it('should return the entity used in the contructor', () => {
      const fakeData1 = new FakeEntity();
      fakeData1.key = 1;
      fakeData1.id = '1';
      const fakeData2 = new FakeEntity();
      fakeData1.key = 2;
      fakeData2.id = '2';
      const modelTemplate1 = new EntityModelTemplate(fakeData1);
      const modelTemplate2 = new EntityModelTemplate(fakeData2);
      expect(modelTemplate1.data).toBe(fakeData1);
      expect(modelTemplate1.key).toEqual(fakeData1.key);
      expect(modelTemplate1.id).toEqual(fakeData1.id);
      expect(modelTemplate1.createdAt).toEqual(fakeData1.createAt);
      expect(modelTemplate1.updatedAt).toEqual(fakeData1.updateAt);
      expect(modelTemplate2.data).toBe(fakeData2);
      expect(modelTemplate2.key).toEqual(fakeData2.key);
      expect(modelTemplate2.id).toEqual(fakeData2.id);
      expect(modelTemplate2.createdAt).toEqual(fakeData2.createAt);
      expect(modelTemplate2.updatedAt).toEqual(fakeData2.updateAt);
    });
  });

  // describe('paginateList', () => {
  //   it('should return amount of elements specified by perPage (or available at that page)', () => {
  //     const list = [1, 2, 3, 4, 5, 6, 7];
  //     const modelTemplate = new ModelTemplate(contextMock.object, 'derp');
  //     expect(list).toHaveLength(7);
  //     const paginatedList1 = modelTemplate.paginateList(list, 3, 0);
  //     expect(paginatedList1).toHaveLength(3);
  //     const paginatedList2 = modelTemplate.paginateList(list, 5, 0);
  //     expect(paginatedList2).toHaveLength(5);
  //     const paginatedList3 = modelTemplate.paginateList(list, 10, 0);
  //     expect(paginatedList3).toHaveLength(7);
  //     const paginatedList4 = modelTemplate.paginateList(list, 3, 1);
  //     expect(paginatedList4).toHaveLength(3);
  //     const paginatedList5 = modelTemplate.paginateList(list, 5, 1);
  //     expect(paginatedList5).toHaveLength(2);
  //   });
  // });

  // it('should return in that page as the page index increases', () => {
  //   const list = ['flerp', 'derp', 'fizz', 'buzz', 'foo', 'bar', 'disco', 'inferno'];
  //   const modelTemplate = new ModelTemplate(contextMock.object, 'derp');
  //   const paginatedList1 = modelTemplate.paginateList(list, 3, 0);
  //   expect(paginatedList1[0]).toBe('flerp');
  //   expect(paginatedList1[1]).toBe('derp');
  //   expect(paginatedList1[2]).toBe('fizz');
  //   const paginatedList2 = modelTemplate.paginateList(list, 3, 1);
  //   expect(paginatedList2[0]).toBe('buzz');
  //   expect(paginatedList2[1]).toBe('foo');
  //   expect(paginatedList2[2]).toBe('bar');
  //   const paginatedList3 = modelTemplate.paginateList(list, 3, 2);
  //   expect(paginatedList3[0]).toBe('disco');
  //   expect(paginatedList3[1]).toBe('inferno');
  //   expect(paginatedList3[2]).toBe(undefined);
  // });

  // it('should be an immutable function', () => {
  //   const list = ['flerp', 'derp', 'fizz', 'buzz', 'foo', 'bar', 'disco', 'inferno'];
  //   const modelTemplate = new ModelTemplate(contextMock.object, 'derp');
  //   const paginatedList = modelTemplate.paginateList(list, 8, 0);
  //   expect(paginatedList).not.toBe(list);
  // })
});
