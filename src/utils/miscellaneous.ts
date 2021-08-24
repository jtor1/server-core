import { chunk } from 'lodash';


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
  We want each promise to either
    * spawn a new promise or
    * terminate.
  We want this to happen even if there is an error during execution.
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
  let results: any = {};

  // A recursion in two parts,
  // each function will call the other after each promise
  // until `storeAndTryNext` terminates the process by returning `null`

  // * do the operation
  // * whether we succeed or not, try to pull again from the queue
  const work = (item: T, index: number) => operation(item, index, items)
        .then(nextResult => storeAndTryNext(nextResult, index))
        .catch((_e:any) => storeAndTryNext(null, index))

  // * store the indexed result
  // * if we're out of work end the chain by returning null
  // * otherwise recurse on work()
  const storeAndTryNext = (result: U | null, index: number): Promise<U | null> | null => {
    results[index] = result;
    if(workQueue.length === 0) { return null; }
    return work(workQueue.shift()!, currentIndex++);
  }
  // start the promise wall and wait for it to finish
  let promiseGroup = initialBatch.map((item, index) => work(item, index));
  await Promise.all(promiseGroup);
  return Object.keys(results)
    .sort((a,b) => parseInt(a, 10) - parseInt(b, 10))
    .map(key => results[key]);
}
