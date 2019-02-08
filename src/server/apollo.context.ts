export interface IContext {

}

export class Context {
  constructor() {
    console.log('Im a context!');
  }
}

export const createContext = <T>(context?: T): T | Context => {
  if (context) {
    return context;
  } else {
    return new Context();
  }
}

