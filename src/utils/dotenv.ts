import * as dotenv from 'dotenv';


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
  //   inclusive test is safer (vs. exclusive; `!== 'production'`)
  if ((process.env.NODE_ENV === 'test') || (process.env.NODE_ENV === 'ci')) {
    [ 'POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE' ].forEach((key) => {
      delete process.env[key];
    });
  }

  // now we're good to go
  dotenv.config({
    path: <string>(process.env.DOTENV_CONFIG_PATH || null),
  });

  const env = process.env;
  return {
    env,
    isProduction: (env.NODE_ENV === 'production'),
    isTest: ((env.NODE_ENV === 'test') || (env.NODE_ENV === 'ci')),
  };
}
