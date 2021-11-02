import { createSandbox, SinonSpy } from 'sinon';
import { noop } from 'lodash';

import {
  BatchPipelineOperation,
  BatchPipelineExecutor,
  BatchPipelineExecutorOptions,
  executeOperationsInBatches,
} from './batch';


const sandbox = createSandbox();
const POISON = -1;

function _setupPipelineSink<T = number>(options?: BatchPipelineExecutorOptions<T> & {
  poisonItem?: T,
}) {
  const sink: T[] = [];
  const operation: BatchPipelineOperation<T> = async (items: T[]) => {
    // do not execute synchronously;
    //   we need fine-grained control over assertion timing
    await Promise.resolve();

    // under real-world conditions, one bad apple will spoil the whole batch
    const poison = options?.poisonItem;
    if ((poison !== undefined) && items.includes(poison)) {
      throw new Error('POISON');
    }

    for (const item of items) {
      sink.push(item);
    }
  };
  const operationSpy = sandbox.spy(operation);

  const executor = new BatchPipelineExecutor(operationSpy, options);
  return {
    executor,
    sink,
    operationSpy,
  }
}

async function _allowExecution() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function _teardownPipelineSink<T>(executor: BatchPipelineExecutor<T>) {
  // any Error scenario queued up into the Executor must be handled by the caller
  //   ... except cordoning.  we can FTFY
  executor._items.length = 0;
  executor._unreportedErrors.length = 0;
  await executor.flush();
}


describe('utils/execution/batch', () => {
  afterEach(() => {
    sandbox.verifyAndRestore();
  });


  describe('executeOperationsInBatches', () => {
    let sink: number[];
    let operationSpy: SinonSpy;

    beforeEach(() => {
      sink = [];
      operationSpy = sandbox.spy(async (items) => {
        if (items.includes(POISON)) {
          throw new Error('POISON');
        }
        sink = sink.concat(items);
      });
    });

    it('executes in batches', async () => {
      await executeOperationsInBatches([ 1, 2, 3, 4, 5 ], operationSpy, { batchSize: 3 });

      expect(sink).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(operationSpy.callCount).toBe(2);
    });

    it('executes in batches', async () => {
      await executeOperationsInBatches([ 1, 2, 3, 4, 5 ], operationSpy, { batchSize: 3 });

      expect(sink).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(operationSpy.callCount).toBe(2);
    });

    describe('without an onError callback', () => {
      it('rejects due to poison', async () => {
        await expect(
          executeOperationsInBatches([ 1, 2, 3, 4, POISON, 6, 7 ], operationSpy, { batchSize: 3 })
        ).rejects.toThrow(/POISON/);

        expect(sink).toEqual([ 1, 2, 3 ]);
        expect(operationSpy.callCount).toBe(2);
      });
    });

    describe('with an onError callback', () => {
      it('notifies of Errors due to poison', async () => {
        const onError = sandbox.spy();
        await executeOperationsInBatches([ 1, 2, 3, 4, POISON, 6, 7 ], operationSpy, {
          batchSize: 3,
          onError,
        });

        expect(sink).toEqual([ 1, 2, 3, 7 ]);
        expect(operationSpy.callCount).toBe(3);

        expect(onError.callCount).toBe(1);
        expect(onError.args[0][0].message).toMatch(/POISON/);
        expect(onError.args[0][1]).toEqual([ 4, POISON, 6 ]);
      });
    });
  });


  describe('BatchPipelineOperation', () => {
    describe('constructor', () => {
      const OPERATION: BatchPipelineOperation<unknown> = async () => { /* void */ };

      it('populates an instance', () => {
        const onError = (_error: Error) => { /* no op */ };
        const executor = new BatchPipelineExecutor(OPERATION, {
          batchSize: 23,
          onError,
        });

        expect(executor).toMatchObject({
          isCordoned: false,
          _options: {
            batchSize: 23,
            onError,
          },
          _items: [],
          _activePromise: undefined,
          _unreportedErrors: [],
        });
      });

      it('falls back to defaults', () => {
        const executor = new BatchPipelineExecutor(OPERATION);

        expect(executor).toMatchObject({
          isCordoned: false,
          _options: {
            batchSize: 8,
            onError: undefined,
          },
          _items: [],
          _activePromise: undefined,
          _unreportedErrors: [],
        });
      });
    });

    describe('#push', () => {
      it('triggers an execution once batchSize is reached', async () => {
        const { executor } = _setupPipelineSink({ batchSize: 3 });

        executor.push(1).push(2);
        expect(executor._items).toEqual([ 1, 2 ]);
        expect(executor._activePromise).toBeUndefined();

        executor.push(3);
        expect(executor._activePromise).not.toBeUndefined();

        expect(executor._unreportedErrors.length).toBe(0);
        await _teardownPipelineSink(executor);
      });

      it('will not push when the Executor is cordoned off', async () => {
        const { executor } = _setupPipelineSink({ batchSize: 3 });

        executor.push(1).cordon(true);
        expect(executor.isCordoned).toBe(true);
        expect(executor._items).toEqual([ 1 ]);
        expect(executor._activePromise).toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(0);

        executor.push(2).cordon(false);
        expect(executor.isCordoned).toBe(false);
        expect(executor._items).toEqual([ 1 ]);
        expect(executor._activePromise).toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(1);

        executor.push(2);
        expect(executor._items).toEqual([ 1, 2 ]);
        expect(executor._activePromise).toBeUndefined();
        // it('does not forget the prior Error')
        expect(executor._unreportedErrors.length).toBe(1);

        await _teardownPipelineSink(executor);
      });
    });

    describe('#pushAll', () => {
      it('triggers an execution once batchSize is reached', async () => {
        const { executor } = _setupPipelineSink({ batchSize: 5 });

        executor.pushAll([ 1, 2 ]).pushAll([ 3, 4 ]);
        expect(executor._items).toEqual([ 1, 2, 3, 4 ]);
        expect(executor._activePromise).toBeUndefined();

        executor.pushAll([ 5 ]);
        expect(executor._activePromise).not.toBeUndefined();

        expect(executor._unreportedErrors.length).toBe(0);
        await _teardownPipelineSink(executor);
      });

      it('will not push when the Executor is cordoned off', async () => {
        const { executor } = _setupPipelineSink({ batchSize: 5 });

        executor.pushAll([ 1, 2 ]).cordon(true);
        expect(executor.isCordoned).toBe(true);
        expect(executor._items).toEqual([ 1, 2 ]);
        expect(executor._activePromise).toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(0);

        executor.pushAll([ 3, 4 ]).cordon(false);
        expect(executor.isCordoned).toBe(false);
        expect(executor._items).toEqual([ 1, 2 ]);
        expect(executor._activePromise).toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(1);

        executor.pushAll([ 3, 4 ]);
        expect(executor._items).toEqual([ 1, 2, 3, 4 ]);
        expect(executor._activePromise).toBeUndefined();
        // it('does not forget the prior Error')
        expect(executor._unreportedErrors.length).toBe(1);

        await _teardownPipelineSink(executor);
      });
    });


    describe('#_handleError', () => {
      it('is thoroughly covered by everything else',  noop);
    });

    describe('#cordon', () => {
      it('is covered by #_enforceCordoning',  noop);
    });

    describe('#_enforceCordoning', () => {
      const ITEMS = [ 1 ];

      it('does nothing unless the instance is cordoned off', () => {
        const { executor } = _setupPipelineSink();
        expect(executor.isCordoned).toBe(false);

        expect(executor._enforceCordoning(ITEMS)).toBe(false);
        expect(executor._unreportedErrors.length).toBe(0);
      });

      it('queues up an Error when cordoned off', () => {
        const { executor } = _setupPipelineSink();

        expect(executor.cordon(true)._enforceCordoning(ITEMS)).toBe(true);
        expect(executor.isCordoned).toBe(true);
        expect(executor._unreportedErrors.length).toBe(1);

        const [ error ] = executor._unreportedErrors;
        expect(error.message).toMatch(/rejected new items/);

        // it('does not forget the prior Error')
        expect(executor._enforceCordoning(ITEMS)).toBe(true);
        expect(executor._unreportedErrors.length).toBe(2);
        expect(executor._unreportedErrors[0]).toBe(error);

        // it('does not abandon the prior Error once uncordoned')
        //   eg. you cannot simply undo the past
        expect(executor.cordon(false)._enforceCordoning(ITEMS)).toBe(false);
        expect(executor._unreportedErrors.length).toBe(2);
      });

      it('notifies the callback of an Error when cordoned off', () => {
        const onError = sandbox.spy();
        const { executor } = _setupPipelineSink({
          onError
        });

        expect(executor.cordon(true)._enforceCordoning(ITEMS)).toBe(true);
        // it('assumes that it has handled the Error')
        expect(executor._unreportedErrors.length).toBe(0);

        expect(onError.callCount).toBe(1);
        expect(onError.args[0][0].message).toMatch(/rejected new items/);
        expect(onError.args[0][1]).toBe(ITEMS);
      });
    });


    describe('#_executeOnPressure', () => {
      it('triggers an execution once batchSize is reached', async () => {
        const { executor } = _setupPipelineSink({ batchSize: 3 });

        expect(executor._executeOnPressure()).toBe(false);
        expect(executor._activePromise).toBeUndefined();

        expect(executor.pushAll([ 1, 2 ])._executeOnPressure()).toBe(false);

        // pushing would release the pressure, so ...
        executor._items.push(3);
        expect(executor._executeOnPressure()).toBe(true);
        expect(executor._activePromise).not.toBeUndefined();

        await _teardownPipelineSink(executor);
      });
    });

    describe('#_executeNextBatch', () => {
      let executor: BatchPipelineExecutor<number>;
      let sink: number[];
      let operationSpy: SinonSpy;

      beforeEach(() => {
        const setup = _setupPipelineSink<number>({
          batchSize: 3,
          poisonItem: POISON,
        });
        executor = setup.executor;
        sink = setup.sink;
        operationSpy = setup.operationSpy;
      });
      afterEach(async () => {
        await _teardownPipelineSink(executor);
      });

      it('does nothing without any items', async () => {
        expect(executor._items.length).toBe(0);

        executor._executeNextBatch();
        expect(executor._activePromise).toBeUndefined();
        expect(operationSpy.callCount).toBe(0);
      });

      it('executes the next batch of items', async () => {
        // avoid #push operations, since they act under pressure
        executor._items = [ 1, 2, 3, 4 ];
        expect(executor._activePromise).toBeUndefined();

        executor._executeNextBatch();
        expect(executor._activePromise).not.toBeUndefined();
        expect(executor._items).toEqual([ 4 ]);
        // it('has started an operation')
        expect(operationSpy.callCount).toBe(1);

        // it('will not take on a new batch until the current one has finished')
        executor.pushAll([ 5, 6, 7 ])._executeNextBatch();
        expect(executor._items).toEqual([ 4, 5, 6, 7 ]);
        expect(sink).toEqual([]);
        expect(operationSpy.callCount).toBe(1);

        // it('will ultimately execute all batches')
        //   including a partial batch
        await _allowExecution();
        expect(executor._activePromise).toBeUndefined();
        expect(executor._items).toEqual([ ]);
        expect(sink).toEqual([ 1, 2, 3, 4, 5, 6, 7 ]);
        expect(operationSpy.callCount).toBe(3);

        expect(executor._unreportedErrors.length).toBe(0);
      });

      it('retries failed work', async () => {
        // avoid #push operations, since they act under pressure
        executor._items = [ 1, 2, POISON, 4 ];
        expect(executor._activePromise).toBeUndefined();

        executor._executeNextBatch();
        expect(executor._activePromise).not.toBeUndefined();
        expect(executor._items).toEqual([ 4 ]);
        expect(sink).toEqual([]);
        expect(operationSpy.callCount).toBe(1);

        // it('restores the failed items to the batch')
        await _allowExecution();
        expect(executor._activePromise).toBeUndefined();
        expect(executor._items).toEqual([ 1, 2, POISON, 4 ]);
        expect(executor._unreportedErrors.length).toBe(1);
        expect(sink).toEqual([]);
        expect(operationSpy.callCount).toBe(1);

        const [ error ] = executor._unreportedErrors;
        expect(error.message).toMatch(/POISON/);

        // it('gets the same results a second time')
        executor._executeNextBatch();
        await _allowExecution();
        expect(executor._items).toEqual([ 1, 2, POISON, 4 ]);
        expect(executor._unreportedErrors.length).toBe(2);
        expect(operationSpy.callCount).toBe(2);

        // it('does fine once the poison is removed')
        executor._items[2] = 3;
        executor._executeNextBatch();
        await _allowExecution();
        expect(executor._activePromise).toBeUndefined();
        expect(executor._items).toEqual([]);
        expect(executor._unreportedErrors.length).toBe(2);
        expect(sink).toEqual([ 1, 2, 3, 4 ]);
        expect(operationSpy.callCount).toBe(4);
      });

      it('notifies the callback of an Error', async () => {
        // not the usual setup
        const onError = sandbox.spy();
        const setup = _setupPipelineSink<number>({
          batchSize: 3,
          poisonItem: POISON,
          onError,
        });
        executor = setup.executor; // for `afterEach` purposes

        // avoid #push operations, since they act under pressure
        executor._items = [ 1, 2, POISON, 4 ];

        executor._executeNextBatch();
        await _allowExecution();
        // it('does not attempt a retry')
        expect(executor._items).toEqual([ 4 ]);
        expect(sink).toEqual([]);
        // it('assumes that it has handled the Error')
        expect(executor._unreportedErrors.length).toBe(0);

        expect(onError.callCount).toBe(1);
        expect(onError.args[0][0].message).toMatch(/POISON/);
        expect(onError.args[0][1]).toEqual([ 1, 2, POISON ]);
      });
    });

    describe('#isFlushed', () => {
      let executor: BatchPipelineExecutor<number>;

      beforeEach(() => {
        const setup = _setupPipelineSink<number>({
          poisonItem: POISON,
        });
        executor = setup.executor;

        expect(executor.isFlushed).toBe(true);
      });
      afterEach(async () => {
        // it('is flushable by the end of each Test Case')
        await executor.flush();
        expect(executor.isFlushed).toBe(true);
      });

      it('requires no unprocessed items', async () => {
        executor.push(1);
        expect(executor._items.length).toBe(1);
        expect(executor._activePromise).toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(0);

        expect(executor.isFlushed).toBe(false);
      });

      it('requires no batches to be in-flight', async () => {
        executor.push(1);
        executor._executeNextBatch();

        expect(executor._items.length).toBe(0);
        expect(executor._activePromise).not.toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(0);

        expect(executor.isFlushed).toBe(false);
      });

      it('requires no batches to be in-flight', async () => {
        executor.push(POISON);
        executor._executeNextBatch();
        await _allowExecution();
        executor._items.shift();

        expect(executor._items.length).toBe(0);
        expect(executor._activePromise).toBeUndefined();
        expect(executor._unreportedErrors.length).toBe(1);

        expect(executor.isFlushed).toBe(false);

        // demonstrating what needs to be corrected before it can be flushed
        executor._unreportedErrors.shift();
      });
    });

    describe('#flush', () => {
      let executor: BatchPipelineExecutor<number>;
      let sink: number[];

      beforeEach(() => {
        const setup = _setupPipelineSink<number>({
          batchSize: 3,
          poisonItem: POISON,
        });
        executor = setup.executor;
        sink = setup.sink;

        expect(executor.isFlushed).toBe(true);
      });
      afterEach(async () => {
        expect(executor.isFlushed).toBe(true);
      });

      it('kicks off a batch', async () => {
        executor.push(1);
        expect(executor._activePromise).toBeUndefined();

        await executor.flush();
        expect(sink).toEqual([ 1 ]);
      });

      it('continues an existing batch', async () => {
        executor.pushAll([ 1, 2, 3 ]);
        expect(executor._activePromise).not.toBeUndefined();

        await executor.flush();
        expect(sink).toEqual([ 1, 2, 3 ]);
      });

      describe('without an onError callback', () => {
        it('rejects due to cordoning', async () => {
          executor.pushAll([ 1, 2, 3, 4 ]).cordon(true).push(5);

          await expect( executor.flush() ).rejects.toThrow(/rejected new items/);
          expect(sink).toEqual([ 1, 2, 3 ]);

          await executor.flush()
          expect(sink).toEqual([ 1, 2, 3, 4 ]);
        });

        it('rejects due to poison', async () => {
          executor.pushAll([ 1, 2, POISON, 4, POISON, 6 ]);

          // it('needs an antidote')
          await expect( executor.flush() ).rejects.toThrow(/POISON/);
          await expect( executor.flush() ).rejects.toThrow(/POISON/);
          await expect( executor.flush() ).rejects.toThrow(/POISON/);
          expect(executor._items).toEqual([ 1, 2, POISON, 4, POISON, 6 ]);
          expect(sink).toEqual([]);

          // it('is not out of the woods yet')
          executor._items[2] = 3;
          await expect( executor.flush() ).rejects.toThrow(/POISON/);
          expect(sink).toEqual([ 1, 2, 3 ]);

          executor._items[1] = 5;
          await executor.flush()
          expect(sink).toEqual([ 1, 2, 3, 4, 5, 6 ]);
        });

        it('has a really bad day', async () => {
          executor.pushAll([ 1, 2, 3, 4, POISON ]).cordon(true).push(6);

          await expect( executor.flush() ).rejects.toThrow(/rejected new items/);
          await expect( executor.flush() ).rejects.toThrow(/POISON/);
          executor._items[1] = 5;

          await executor.flush()
          expect(sink).toEqual([ 1, 2, 3, 4, 5 ]);
        });
      });

      describe('with an onError callback', () => {
        let onError: SinonSpy;

        beforeEach(() => {
          // not the usual setup
          onError = sandbox.spy();
          const setup = _setupPipelineSink<number>({
            batchSize: 3,
            poisonItem: POISON,
            onError,
          });
          executor = setup.executor;
          sink = setup.sink;

          expect(executor.isFlushed).toBe(true);
        });

        it('notifies of Errors due to cordoning', async () => {
          executor.pushAll([ 1, 2, 3, 4 ]).cordon(true).push(5);

          await executor.flush()
          expect(sink).toEqual([ 1, 2, 3, 4 ]);

          expect(onError.callCount).toBe(1);
          expect(onError.args[0][0].message).toMatch(/rejected new items/);
          expect(onError.args[0][1]).toEqual([ 5 ]);
        });

        it('notifies of Errors due to poison', async () => {
          executor.pushAll([ 1, 2, POISON, 4, POISON, 6 ]);

          await executor.flush()
          expect(sink).toEqual([]);

          expect(onError.callCount).toBe(2);
          expect(onError.args[0][0].message).toMatch(/POISON/);
          expect(onError.args[0][1]).toEqual([ 1, 2, POISON ]);
          expect(onError.args[1][0].message).toMatch(/POISON/);
          expect(onError.args[1][1]).toEqual([ 4, POISON, 6 ]);
        });

        it('has a really bad day', async () => {
          executor.pushAll([ 1, 2, 3, 4, POISON ]).cordon(true).push(6);

          await executor.flush()
          expect(sink).toEqual([ 1, 2, 3 ]);

          expect(onError.callCount).toBe(2);
          expect(onError.args[0][0].message).toMatch(/rejected new items/);
          expect(onError.args[0][1]).toEqual([ 6 ]);
          expect(onError.args[1][0].message).toMatch(/POISON/);
          expect(onError.args[1][1]).toEqual([ 4, POISON ]);
        });
      });
    });
  });

});
