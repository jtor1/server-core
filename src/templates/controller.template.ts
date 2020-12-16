import DataLoader, { Options } from 'dataloader';
import { compact, groupBy, keyBy } from 'lodash';
import { produce } from 'immer';

import { ModelTemplate } from './model.template';
import { IContext } from '../server/apollo.context';


// <T> = the ModelTemplate / `typeorm` @Entity type being controlled
// <LoaderKeys> = a TypeScript `type` calling out the keys available to `loaders`
//   for DataLoader scoping purposes
//   @see the spec file for a practical example
export class ControllerTemplate<T, LoaderKeys extends string> {

  // DataLoaders, keyed by <LoaderKeys>
  //   which return a single Model per query
  //   eg. `const userByUsername: User | null = await this.loaders['byUsername'].load('uniqueUsername');`
  //   eg. `const usersByUsername: User[] = await this.loaders['byUsername'].loadMany([ 'user-A', 'user-B' ]);`
  //   @see the spec file for a practical example
  public loaders: Record<LoaderKeys, DataLoader<string, T>> = {} as Record<LoaderKeys, DataLoader<string, T>>;

  // helpers for integrating TypeORM and single-Model DataLoaders
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


  // DataLoaders, (also) keyed by <LoaderKeys>
  //   which return a multiple Models per query
  //   eg. `const usersForEvent: Array<User> | null = await this.loaders['forEvent'].load('eventId');`
  //   eg. `const usersForEvents: Array<User>[] = await this.loaders['forEvent'].loadMany([ 'event-A', 'event-B' ]);`
  //   @see the spec file for a practical example
  public loadersMulti: Record<LoaderKeys, DataLoader<string, Array<T>>> = {} as Record<LoaderKeys, DataLoader<string, Array<T>>>;

  // helpers for integrating TypeORM and multiple-Model DataLoaders
  public wrapQueryInDataLoaderMulti = (
    query: (keys: Array<string>) => Promise<Array<Array<T>>>, // an Array of Model Arrays
    options?: Options<string, Array<T>>
  ): DataLoader<string, Array<T>> => {
    return new DataLoader(query, options);
  }

  /**
   * @param ids {String[]} the IDs used for the DataLoader fetch
   * @param results {T[]} the Models resolved by the DataLoader fetch
   * @param [idDeriver] {Function} a Function returning an ID which corresponds to a value from `ids`
   * @returns {T[T[]]} an Array of Model Arrays,
   *   grouped / collated per the `ids` provided
   *   and ordered in one-to-one correspondence with `ids`.
   *   when no Models match a given ID, its corresponding Array is empty (vs. undefined)
   */
  public groupAndOrderMultiResultsByIds = (
    ids: Array<string>,
    results: Array<T>,
    idDeriver: (model: T) => string // | null | undefined
  ): Array<Array<T>> => {
    // TODO:  fail if `resultsGrouped` contains any key *outside of* `ids`?
    const resultsGrouped = groupBy(results, idDeriver);

    // any ID with no results gets an empty Array
    return ids.map((id) => {
      const grouped = resultsGrouped[id];
      return (grouped ? compact(grouped) : []);
    });
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


// a Controller that is aware of its own Context
//   <C> = the Context being controlled
export class ControllerTemplateWithContext<T extends ModelTemplate, C extends IContext, LoaderKeys extends string>
  extends ControllerTemplate<T, LoaderKeys>
{
  public readonly context: C;

  constructor(context: C) {
    super();

    this.context = context;
  }
}
