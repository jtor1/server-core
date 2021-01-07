import mockFs from 'mock-fs';

import {
  loadDotEnv,
} from './dotenv';


// one property is sufficiently representative
const PREEXISTING_CONFIG = Object.freeze({
  POSTGRES_HOST: 'ENVIRONMENT',
  UNCHANGED: 'UNCHANGED',
} as Record<string, any>);
const OVERRIDING_FILE_CONTENTS = `POSTGRES_HOST=OVERRIDING`;
const OVERRIDING_CONFIG = Object.freeze({
  POSTGRES_HOST: 'OVERRIDING',
  UNCHANGED: 'UNCHANGED', // we don't touch it
});


describe('typeorm/index', () => {
  const { env } = process;
  let envSnapshot: Record<string, string>;

  beforeEach(() => {
    // "error TS2322: Type 'ProcessEnv' is not assignable to type 'Record<string, string>'."
    envSnapshot = JSON.parse(JSON.stringify(env));

    // removing colliding properties to allow overrrides
    delete env.NODE_ENV;
  });

  afterEach(() => {
    mockFs.restore();

    // restore environment
    Object.keys(env).forEach((key) => {
      delete env[key];
    });
    Object.assign(env, envSnapshot);
  });


  describe('loadDotEnv', () => {
    describe('for its configuration file location', () => {
      it('loads the default file', () => {
        expect(env.DOTENV_CONFIG_PATH).toBeUndefined();

        mockFs({
          '.env': `# default filepath
FILEPATH=default
          `,
        });

        loadDotEnv();

        const loaded = loadDotEnv();

        expect(loaded.env.FILEPATH).toBe('default');
        expect(process.env.FILEPATH).toBe('default');
      });

      it('loads a specified file', () => {
        const FILEPATH = '/path/to/.env';
        env.DOTENV_CONFIG_PATH = FILEPATH;

        mockFs({
          [ FILEPATH ]: `
FILEPATH=specified
          `,
        });

        const loaded = loadDotEnv();

        expect(loaded.env.FILEPATH).toBe('specified');
        expect(process.env.FILEPATH).toBe('specified');
      });
    });


    describe('before the load', () => {
      beforeEach(() => {
        // pre-existing (colliding) properties in `process.env`
        Object.keys(PREEXISTING_CONFIG).forEach((key) => {
          env[key] = PREEXISTING_CONFIG[key];
        });
      });

      it('overrides pre-existing configuration in a Test environment', () => {
        env.NODE_ENV = 'test';
        mockFs({
          '.env': OVERRIDING_FILE_CONTENTS,
        });

        loadDotEnv();

        expect(env).toMatchObject(OVERRIDING_CONFIG);
      });

      it('overrides pre-existing configuration in a CI environment', () => {
        env.NODE_ENV = 'test';
        mockFs({
          '.env': OVERRIDING_FILE_CONTENTS,
        });

        loadDotEnv();

        expect(env).toMatchObject(OVERRIDING_CONFIG);
      });

      it('preserves pre-existing configuration in other environments', () => {
        env.NODE_ENV = 'production';
        mockFs({
          '.env': OVERRIDING_FILE_CONTENTS,
        });

        loadDotEnv();

        expect(env).toMatchObject(PREEXISTING_CONFIG);
      });
    });


    describe('in its response', () => {
      it('recognizes a Production environment', () => {
        mockFs({
          '.env': 'NODE_ENV=production',
        });

        const loaded = loadDotEnv();

        expect(loaded).toMatchObject({
          isProduction: true,
          isTest: false,
        });
      });

      it('recognizes a Test environment', () => {
        mockFs({
          '.env': 'NODE_ENV=test',
        });

        const loaded = loadDotEnv();

        expect(loaded).toMatchObject({
          isProduction: false,
          isTest: true,
        });
      });

      it('recognizes CI as a Test environment', () => {
        mockFs({
          '.env': 'NODE_ENV=ci',
        });

        const loaded = loadDotEnv();

        expect(loaded).toMatchObject({
          isProduction: false,
          isTest: true,
        });
      });

      it('does not recognizes other environments', () => {
        mockFs({
          '.env': 'NODE_ENV=development',
        });

        const loaded = loadDotEnv();

        expect(loaded).toMatchObject({
          isProduction: false,
          isTest: false,
        });
      });
    });
  });
});
