export class Context {
  constructor() {
    console.log('Im a context!');
  }
}

export const createContext = () => {
  return new Context();
}

