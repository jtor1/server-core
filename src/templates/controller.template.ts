import { getConnection } from 'typeorm';
import DataLoader from 'dataloader';
import _ from 'lodash';
import { produce } from 'immer';

export class ControllerTemplate<T> {
  public loader: DataLoader<string, T>;

  public get connection() {
    return getConnection()
  }

  public wrapQueryInDataLoader = (query: (keys: Array<string>) => Promise<Array<T>>) => {
    return new DataLoader(query);
  }

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