import * as dotenv from 'dotenv';
import fs from 'fs';


export interface LoadDotEnvResult {
  env: Record<string, any>;
  isProduction: boolean;
  isTest: boolean;
}

export function loadDotEnv(): LoadDotEnvResult {
  // much of this is to support smooth integration with @withjoy/server-core-test

  // The Battle of the `dotenv`s
  //   `typeorm` is making assumptions that we don't want it to make
  //   https://github.com/typeorm/typeorm/issues/391 "discussion: add support for dotenv files in CLI"
  //     implemented as:
  //     ```
  //     if (foundFileFormat === "env") {
  //         const dotenv = PlatformTools.load("dotenv");
  //         dotenv.config({ path: this.baseFilePath });
  //     } else if (PlatformTools.fileExist(".env")) {
  //         const dotenv = PlatformTools.load("dotenv");
  //         dotenv.config({ path: ".env" });
  //     }
  //     ```
  //     so, it will load any `.env` that it finds
  //   https://github.com/motdotla/dotenv#faq
  //     "In particular, if there is a variable in your .env file which collides with one that already exists in your environment,
  //      then that variable will be skipped"
  //   so even when we do our own `dotenv` + DOTENV_CONFIG_PATH trickery to load 'test/.env',
  //     the configuration has no effect
  //   https://github.com/typeorm/typeorm/issues/3567 "Provide an options to prevent loading .env file"
  //     does not exist yet
  //   so we parse the file at the specified path
  //     and erase any values pre-baked into the `process.env`
  //     (due to `typeorm`s behavior)
  const dotEnvPath = (process.env.DOTENV_CONFIG_PATH || undefined);
  if ((process.env.NODE_ENV === 'test') || (process.env.NODE_ENV === 'ci')) {
    if (dotEnvPath) {
      const parsed = dotenv.parse(fs.readFileSync(dotEnvPath, { encoding: 'utf8' }))
      Object.keys(parsed).forEach((key) => {
        delete process.env[key];
      });
    }
  }

  // now we're good to go
  dotenv.config({
    path: dotEnvPath,
  });

  const env = process.env;
  const isProduction = (env.NODE_ENV === 'production');
  const isTest = ((env.NODE_ENV === 'test') || (env.NODE_ENV === 'ci'));

  // database naming convention to avoid deleting real-world data
  const { POSTGRES_DATABASE } = env;
  const dbHasName = Boolean(POSTGRES_DATABASE);
  const dbIsNamedTest = Boolean(POSTGRES_DATABASE?.endsWith('_test'));
  if (isTest && dbHasName && (! dbIsNamedTest)) {
    throw new Error("loadDotEnv:  the Test Suite POSTGRES_DATABASE name must end with '_test'");
  }
  else if ((! isTest) && dbIsNamedTest)  {
    throw new Error("loadDotEnv:  the POSTGRES_DATABASE name cannot end with '_test'");
  }

  return {
    env,
    isProduction,
    isTest,
  };
}

export function configStringToBoolean(string: string | null | undefined): boolean | undefined {
  if (! string) {
    return undefined;
  }
  switch (string.toLowerCase()) {
    case '0':
    case 'false':
    case 'off':
      return false;
    case '1':
    case 'true':
    case 'on':
      return true;
  }
  return undefined;
}

const FEATURE_FLAG_REGEXP = /^FEATURE_FLAG_.*/;
type ConfigFeatureFlags = Record<string, boolean | string>;

export function deriveConfigFeatureFlags(env: Record<string, string>): ConfigFeatureFlags {
  const derived: ConfigFeatureFlags = {}
  Object.keys(env).forEach((key) => {
    if (! FEATURE_FLAG_REGEXP.test(key)) {
      return;
    }

    const value = env[key];
    if (value === '') {
      return;
    }

    const booleanValue = configStringToBoolean(value);
    if (booleanValue !== undefined) {
      derived[key] = booleanValue;
    }
    else {
      derived[key] = value;
    }
  });

  return derived;
}
