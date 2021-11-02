import { sortBy, identity } from 'lodash';


// to save us from TypeScript side-effects of nullable properties that aren't `| null`
export const NULL_STRING = (<unknown>null as string);


const UUID_REGEXP: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUUID(id: string): boolean {
  return ((!! id) && UUID_REGEXP.test(id));
}


export interface IExecuteOperationsInParallelOptions {
  batchSize?: number;
}
const EXECUTE_MODEL_OPERATIONS_IN_PARALLEL_DEFAULTS: Required<IExecuteOperationsInParallelOptions> = {
  batchSize: 8,
};

/*
  Caution: this function does not eat errors,
  it puts the onus on the user. The whole process will fail on ONE error
  We want each promise to either
    * spawn a new promise or
    * terminate.
  Eg for batchSize = 4 we will do something like:
    () => () => null
    () => () => () => null
    () => null
    () => () => null
  Where each () represents a unit of work.
  Finally, because we don't know what will finish when,
  we need to store results in a map and sort it out at the end.
*/
export async function executeOperationsInParallel<T = any, U = any>(
  items: T[],
  operation: (item: T, index: number, array: T[]) => Promise<U>,
  options?: IExecuteOperationsInParallelOptions
): Promise<U[]> {
  // begin with a wall of `batchSize` promises
  const batchSize = options?.batchSize || EXECUTE_MODEL_OPERATIONS_IN_PARALLEL_DEFAULTS.batchSize;
  const initialBatch = items.slice(0, batchSize);

  // when a promise finishes it will:
  // * store a result
  // * pull from the queue
  // * increment the index
  let workQueue = items.slice(batchSize);
  let currentIndex = batchSize;
  let results: Map<number, U> = new Map();

  // A recursion in two parts,
  // each function will call the other after each promise
  // until `storeAndTryNext` terminates the process by returning `null`

  // represents a unit of work
  const work = (item: T, index: number) => operation(item, index, items)
        .then(nextResult => storeAndTryNext(nextResult, index))

  // * store the indexed result
  // * if we're out of work end the chain by returning null
  // * otherwise recurse on work()
  const storeAndTryNext = (result: U, index: number): Promise<U | null> | null => {
    results.set(index, result);
    if(workQueue.length === 0) { return null; }
    return work(workQueue.shift()!, currentIndex++);
  }
  // start the promise wall and wait for it to finish
  let promiseGroup = initialBatch.map((item, index) => work(item, index));
  await Promise.all(promiseGroup);
  return sortBy(Array.from(results.keys()), identity)
    .map((key:number) => results.get(key) as U);
}
