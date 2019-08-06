import DataLoader from 'dataloader';
import _ from 'lodash';
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
  public wrapQueryInDataLoader = (query: (keys: Array<string>) => Promise<Array<T>>) => {
    return new DataLoader(query);
  }

  // used to reorient your TypeORM Models returned by `wrapQueryInDataLoader`
  //   so that they have a one-to-one ordering with the `ids` passed to your wrapper
  //   (a critical aspect of working with the `dataloader` paradigm)
  //   @see the spec file for a practical example
  public orderResultsByIds = (ids: Array<string>, results: Array<T>, identifier?: string) => {
    const resultsByIds = _.keyBy(results, identifier ? identifier : 'id');
    return ids.map(id => {
      return resultsByIds[id];
    });
  }

  public updateIndexOrder = <T extends { index: number }>(items: Array<T>, from: number, to: number): Array<T> => {
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
