export interface IContext {

}

export class Context {
  constructor() {
    console.log('Im a context!');
  }
}

export const createContext = (context?: IContext): IContext => {
  if (context) {
    return context;
  } else {
    return new Context();
  }
}

