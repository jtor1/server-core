import DataLoader from 'dataloader';
import { keyBy } from 'lodash';
import { produce } from 'immer';


// <T> = the ModelTemplate / `typeorm` @Entity type being controlled
// <LoaderKeys> = a TypeScript `type` calling out the keys available to `loaders`
//   for DataLoader scoping purposes
//   @see the spec file for a practical example
export class ControllerTemplate<T, LoaderKeys extends string> {

  // a pool of DataLoaders, keyed by <LoaderKeys>
  //   eg. `const user = await this.loaders['byUsername'].load('uniqueUsername');`
  public loaders: Record<LoaderKeys, DataLoader<string, T>> = {} as Record<LoaderKeys, DataLoader<string, T>>;

  // a helper for integrating TypeORM and the DataLoader pool
  //   eg. `this.loaders.byId = this.wrapQueryInDataLoader(async (ids: string[]) => { ... });`
  //   @see the spec file for a practical example
  public wrapQueryInDataLoader(query: (keys: Array<string>) => Promise<Array<T>>): DataLoader<string, T> {
    return new DataLoader(query);
  }


  // "orderResultsBy" methods are used to reorient your TypeORM Models returned by `wrapQueryInDataLoader`
  //   so that they have a one-to-one ordering with the `ids` passed to your wrapper
  //   (a critical aspect of working with the `dataloader` paradigm)
  //   @see the spec file for a practical example
  // PS. the `Array<T>` Typing is a lie;
  //   in reality, it acts as `Array<T | undefined>`

  /**
   * @param ids {String[]} the IDs used for the DataLoader fetch
   * @param results {T[]} the Models resolved by the DataLoader fetch
   * @param [jsonPath] {String} an optional JSON Path to derive an ID from the Model
   *   which corresponds to a value from `ids`;
   *   if not provided, `Model.id` is assumed
   */
  public orderResultsByIds(
    ids: Array<string>,
    results: Array<T>,
    jsonPath?: string
  ): Array<T> {
    const resultsByIds = keyBy(results, (jsonPath ? jsonPath : 'id'));
    return ids.map((id) => resultsByIds[id]);
  }

  /**
   * @param ids {String[]} the IDs used for the DataLoader fetch
   * @param results {T[]} the Models resolved by the DataLoader fetch
   * @param [idDeriver] {Function} a Function returning an ID which corresponds to a value from `ids`
   */
  public orderResultsByDerivedId(
    ids: Array<string>,
    results: Array<T>,
    idDeriver: (model: T) => string // | null | undefined
  ): Array<T> {
    const resultsByIds = keyBy(results, idDeriver);
    return ids.map((id) => resultsByIds[id]);
  }

  /**
   * @param ids {String[]} the IDs used for the DataLoader fetch
   * @param results {T[]} the Models resolved by the DataLoader fetch
   * @param [modelDeriver] {Function} a Function returning the Model (from `results`)
   *   which corresponds to a given ID (from `ids`)
   */
  public orderResultsByMatchingModel(
    ids: Array<string>,
    results: Array<T>,
    modelDeriver: (id: string, results: Array<T>) => T // | null | undefined
  ): Array<T> {
    return ids.map((id) => modelDeriver(id, results));
  }


  public updateIndexOrder<T extends { index: number }>(items: Array<T>, from: number, to: number): Array<T> {
    items = items.sort((a, b) => a.index - b.index);
    if (from < 0 || from + 1 > items.length || to < 0 || to + 1 > items.length) {
      return items;
    } else {
      const sortedArray = produce(items, sortedItems => {
        const s1 = to < 0 ? items.length + to : to;
        const s2 = 0;
        const s3 = sortedItems.splice(from, 1)[0];
        sortedItems.splice(s1, s2, s3);
      });
      return sortedArray.map((item, index) => {
        item.index = index;
        return item;
      });
    }
  }

}
