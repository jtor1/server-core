// https://www.typescriptlang.org/docs/handbook/mixins.html
export function applyMixinClasses(BaseClass: any, MixinClasses: any[]): any {
  const { prototype } = BaseClass;

  MixinClasses.forEach((MixinClass) => {
    Object.getOwnPropertyNames(MixinClass.prototype).forEach((name) => {
      const property = Object.getOwnPropertyDescriptor(MixinClass.prototype, name);
      Object.defineProperty(prototype, name, property!);
    });
  });
  return BaseClass;
}
