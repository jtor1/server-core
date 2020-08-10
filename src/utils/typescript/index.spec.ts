import {
  applyMixinClasses,
} from './index';


// a Mixin "provider" Class
export class TestMixinProvider {
  private __foo: string | undefined;
  get foo(): string {
    return this.__foo || '';
  }
  set foo(foo: string) {
    this.__foo = foo;
  }
}

// a Class which incorporates the Mixin
//   `export` isn't neccessary for the Test Suite;
//   it's just here to provide a practical real-world example
export interface TestMixinConsumer
  extends TestMixinProvider
{ };
export class TestMixinConsumer {
  get bar() {
    return 'bar';
  }
}
applyMixinClasses(TestMixinConsumer, [ TestMixinProvider ]);


describe('core/typescript', () => {
  describe('applyMixins', () => {
    it('mixes one Class into another', () => {
      const consumer = new TestMixinConsumer();

      expect(consumer.foo).toBe('');
      expect(consumer.bar).toBe('bar');

      consumer.foo = 'foo';
      expect(consumer.foo).toBe('foo');
    });
  });
});
