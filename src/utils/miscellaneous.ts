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

export async function executeOperationsInParallel<T = any, U = any>(
  items: T[],
  operation: (item: T) => Promise<U>,
  options?: IExecuteOperationsInParallelOptions
): Promise<U[]> {
  const batchSize = options?.batchSize || EXECUTE_MODEL_OPERATIONS_IN_PARALLEL_DEFAULTS.batchSize;
  const batches = chunk(items, batchSize);
  let results: U[] = [];

  for (let batch of batches) {
    const result = await Promise.all(batch.map(operation));
    results = results.concat(result);
  }

  return results;
}
