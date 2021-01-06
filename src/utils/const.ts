const packageJson = require(`${ __dirname }/../../package.json`);

export const VERSION = packageJson.version;

export function commonLogInformation() {
  return {
    serverCoreVersion: VERSION,
    NODE_ENV: (process.env.NODE_ENV || ''),
  };
}
