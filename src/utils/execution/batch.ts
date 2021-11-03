/**
 * Unlike `ParallelOperation`, this Iterator will not receive (..., index, array)
 *   since the batch of `items` being executed cannot be positionally reconciled
 *   against some "total Array of processed items"
 */
export type BatchPipelineOperation<T> = (items: T[]) => Promise<void>;

export type BatchPipelineExecutorOptions<T> = {
  batchSize?: number;
  /**
   * When `onError` is provided,
   *   the callback Function is notified upon every Error as it occurs.
   *
   * When `onError` is omitted,
   *   all Errors are queued up
   *   and will be sequentially doled out as rejections during `#flush`.
   */
  onError?: (error: Error, items: T[]) => void;
};
const DEFAULT_OPTIONS: BatchPipelineExecutorOptionsStrict<any> = {
  batchSize: 8,
  onError: undefined!, // for a simpler Test Suite
};
type BatchPipelineExecutorOptionsStrict<T> = Required<BatchPipelineExecutorOptions<T>>


/**
 * A Class allowing for fine-grained control of batch pipeline execution.
 *
 * @class
 */
export class BatchPipelineExecutor<T> {
  public isCordoned: boolean = false;

  readonly _options: BatchPipelineExecutorOptionsStrict<T>;
  readonly _unreportedErrors: Error[] = [];
  public _items: T[] = [];
  public _activePromise: Promise<void> | undefined = undefined;

  constructor(
    readonly operation: BatchPipelineOperation<T>,
    options?: BatchPipelineExecutorOptions<T>
  ) {
    this._options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * @see #pushAll
   */
  push(item: T): this {
    return this.pushAll([ item ]);
  }

  /**
   * Enqueues the `items` for batch execution.
   *
   * If the push introduces sufficient items into the queue to warrant a new batch,
   *   the batch is automatically executed in a backgrounded Promise chain (eg. the "pipeline").
   *   You can ensure that all items in the pipeline have been processed by awaiting `#flush`.
   */
  pushAll(items: T[]): this {
    if (this._enforceCordoning(items)) {
      return this;
    }
    this._items = this._items.concat(items);

    this._executeNextBatch(false); // pressure (vs. flushing)
    return this;
  }


  /**
   * @protected
   */
  _handleError(error: Error, items: T[]): void {
    const { onError } = this._options;
    if (onError) {
      // callback immediately
      onError(error, items);
    }
    else {
      // queue for later reporting;
      //   important for avoiding `UnhandledRejection`s
      this._unreportedErrors.push(error);
    }
  }

  /**
   * @protected
   */
  _enforceCordoning(items: T[]): boolean {
    if (! this.isCordoned) {
      return false;
    }

    this._handleError(
      new Error('BatchPipelineExecutor#_enforceCordoning: rejected new items'),
      items
    );
    return true;
  }

  /**
   * Inform the Executor that it should not accept any more items.
   *
   * The free-form nature of the execution pipeline --
   *   eg. add new items and they get processed auto-magically! --
   *   opens up the possibility for problematic scenarios,
   *   such as new items getting enqueued when the Executor's owner believes that all work is "done".
   * When an Executor is 'cordoned off', any newly-arriving items are rejected;
   *   this Error is treated like any other Error during execution.
   */
  cordon(state: boolean): this {
    this.isCordoned = state;
    return this;
  }


  /**
   * @protected
   */
  _executeNextBatch(isFlushing: boolean): void {
    const { operation, _options, _items, _activePromise } = this;
    const { batchSize, onError } = _options;
    if (_items.length === 0) {
      return;
    }
    if ((! isFlushing) && (_items.length < batchSize)) {
      // in pressure mode, only execute full batches
      return;
    }
    if (_activePromise) {
      // @see "onto the next batch"
      return;
    }

    // this will mutate the _items in place
    const batch = _items.splice(0, batchSize);
    const batchPromise = new Promise<void>((resolve) => {
      operation(batch)
      .then(() => {
        // onto the next batch, using the same mode
        this._activePromise = undefined;
        this._executeNextBatch(isFlushing);

        resolve();
      })
      .catch((error) => {
        this._activePromise = undefined;

        if (! onError) {
          // restore the entire batch for later retry;
          //   the onError handler is not expected to correct the problem,
          //   so retry would simply become a death loop
          this._items = batch.concat(this._items);
        }

        this._handleError(error, batch);
        resolve();
      });
    });

    this._activePromise = batchPromise;
  }


  /**
   * @returns {Boolean} true once all items have been processed and all Errors have been reported.
   */
  get isFlushed(): boolean {
    return (
      (this._items.length === 0) &&
      (! this._activePromise) && // nothing in flight
      (this._unreportedErrors.length === 0) // nothing we need to report
    );
  }

  /**
   * Executes all pending batches, and reports all accumulated Errors
   *   which have not been routed to an `onError` callback.
   */
  async flush(): Promise<void> {
    const { _unreportedErrors } = this;

    // bail as soon as things go badly
    while (_unreportedErrors.length === 0) {
      // kick off all remaining batches
      this._executeNextBatch(true); // flushing
      if (! this._activePromise) {
        break;
      }
      await this._activePromise;
    }

    const error = _unreportedErrors.shift();
    if (error) {
      throw error;
    }

    // we are flushed!
  }
}


export async function executeOperationsInBatches<T>(
  items: T[],
  operation: BatchPipelineOperation<T>,
  options?: BatchPipelineExecutorOptions<T>
): Promise<void> {
  const executor = new BatchPipelineExecutor(operation, options);
  return executor.pushAll(items).flush();
}
