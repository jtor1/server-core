export type BatchPipelineOperation<T> = (items: T[]) => Promise<void>;

export type BatchPipelineExecutorOptionsStrict<T> = {
  batchSize: number;
  // when provided, it is notified upon every Error as it occurs;
  //   if omitted, all Errors are queued up
  //   and will be sequentially rejected during #flush
  onError?(error: Error, items: T[]): void;
};
const DEFAULT_OPTIONS: BatchPipelineExecutorOptionsStrict<any> = {
  batchSize: 8,
  onError: undefined, // for a simpler Test Suite
};
export type BatchPipelineExecutorOptions<T> = Partial<BatchPipelineExecutorOptionsStrict<T>>


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

  push(item: T): this {
    if (this._enforceCordoning([ item ])) {
      return this;
    }
    this._items.push(item);
    this._executeOnPressure();
    return this;
  }

  pushAll(items: T[]): this {
    if (this._enforceCordoning(items)) {
      return this;
    }
    this._items = this._items.concat(items);
    this._executeOnPressure();
    return this;
  }


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

  cordon(state: boolean): this {
    this.isCordoned = state;
    return this;
  }


  _executeOnPressure(): boolean {
    const { _items, _options } = this;
    if (_items.length < _options.batchSize) {
      return false;
    }

    this._executeNextBatch();
    return true;
  }

  _executeNextBatch(): void {
    const { operation, _options, _items, _activePromise } = this;
    const { batchSize, onError } = _options;
    if (_items.length === 0) {
      return;
    }
    if (_activePromise) {
      // we will get around to that
      return;
    }

    // this will mutate the _items in place
    const batch = _items.splice(0, batchSize);
    const batchPromise = new Promise<void>((resolve) => {
      operation(batch)
      .then(() => {
        // onto the next batch
        this._activePromise = undefined;
        this._executeNextBatch();

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


  get isFlushed(): boolean {
    return (
      (this._items.length === 0) &&
      (! this._activePromise) && // nothing in flight
      (this._unreportedErrors.length === 0) // nothing we need to report
    );
  }

  async flush(): Promise<void> {
    const { _unreportedErrors } = this;

    // bail as soon as things go badly
    while (_unreportedErrors.length === 0) {
      // kick off all remaining batches
      this._executeNextBatch();
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
