import { createSandbox, SinonFakeTimers } from 'sinon';
import assert from 'assert';

import { FAKE_TIMERS_MS } from '../../../test/helpers/const';
import {
  executePromiseOrTimeout,
} from './timeout';


describe('utils/execution/batch', () => {
  const sandbox = createSandbox();
  let fakeTimers: SinonFakeTimers;

  beforeEach(() => {
    fakeTimers = sandbox.useFakeTimers({
      now: FAKE_TIMERS_MS,
      toFake: [
        'Date',
        'setTimeout', 'clearTimeout', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', // or Promises will lock up
      ],
    });
  });

  afterEach(() => {
    sandbox.verifyAndRestore();
  });


  describe('executePromiseOrTimeout', () => {
    const ERROR = new Error('REJECTED');

    it('executes the Promise', async () => {
      const resolved = await executePromiseOrTimeout(1000, () => Promise.resolve('RESOLVED'));
      expect(resolved).toBe(resolved);
    });

    it('fails the Promise', async () => {
      await expect(
        executePromiseOrTimeout(1000, () => Promise.reject(ERROR))
      ).rejects.toBe(ERROR);
    });

    it('times out', async () => {
      try {
        const promise = executePromiseOrTimeout(1000, () => Promise.resolve('RESOLVED'));
        fakeTimers.tick(1500);

        await promise;
        assert.fail();
      }
      catch (error) {
        expect(error.code).toBe('ETIMEDOUT');
      }
    });

    it('can build its own Error', async () => {
      try {
        const promise = executePromiseOrTimeout(
          1000,
          () => Promise.resolve('RESOLVED'),
          () => ERROR
        );
        fakeTimers.tick(1500);

        await promise;
        assert.fail();
      }
      catch (error) {
        expect(error).toBe(ERROR);
      }
    });
  });
});
