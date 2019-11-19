import 'jest';

import {
  ApolloEnvironmentConfigArgs,
  ApolloEnvironmentVariant,
  deriveApolloEnvironmentConfig,
} from './apollo.config';


const DEFAULT_CONFIG_ARGS: ApolloEnvironmentConfigArgs = {
  serviceName: 'testSuite',
  servicePort: '90210',
};

describe('server/apollo.config', () => {
  let env: Record<string, any>;

  beforeEach(() => {
    env = Object.assign({}, process.env);
  });

  afterEach(() => {
    Object.assign(process.env, env);
  });


  describe('deriveApolloEnvironmentConfig', () => {
    it('expects a known variant', () => {
      expect(() => {
        return deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: <ApolloEnvironmentVariant>'local',
        });
      }).not.toThrow();

      expect(() => {
        return deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: <ApolloEnvironmentVariant>'development',
        });
      }).not.toThrow();

      expect(() => {
        return deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: <ApolloEnvironmentVariant>'staging',
        });
      }).not.toThrow();

      expect(() => {
        return deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: <ApolloEnvironmentVariant>'production',
        });
      }).not.toThrow();

      expect(() => {
        return deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: <ApolloEnvironmentVariant>'UNRECOGNIZED',
        });
      }).toThrow(/unrecognized variant/);
    });

    it('assumes the variant from the environment when one is not provided', () => {
      delete process.env.ENVIRONMENT;
      delete process.env.NODE_ENV;
      expect( deriveApolloEnvironmentConfig(DEFAULT_CONFIG_ARGS).variant ).toBe(ApolloEnvironmentVariant.local);

      process.env.NODE_ENV = 'staging';
      expect( deriveApolloEnvironmentConfig(DEFAULT_CONFIG_ARGS).variant ).toBe(ApolloEnvironmentVariant.staging);

      process.env.ENVIRONMENT = 'production';
      expect( deriveApolloEnvironmentConfig(DEFAULT_CONFIG_ARGS).variant ).toBe(ApolloEnvironmentVariant.production);
    });

    it('leverages arguments into the configuration', () => {
      const configLocal = deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.local,
      });

      expect(configLocal).toMatchObject({
        variant: ApolloEnvironmentVariant.local,
        serviceName: 'testSuite',
        servicePort: 90210, // it('coerces the port into a Number')

        cliArguments: {
          list: expect.stringMatching(/--tag=development.+--endpoint=http:\/\/localhost:90210\/graphql/),
          check: expect.stringMatching(/--tag=development.+--endpoint=http:\/\/localhost:90210\/graphql/),
          push: expect.stringMatching(/--tag=development.+--serviceURL=https:\/\/bliss-gateway-dev.withjoy.com\/graphql/),
        },
        schemaTags: {
          current: 'development',
          future: 'development',
        },
        serviceConfig: {
          endpoint: {
            name: 'testSuite',
            url: 'http://localhost:90210/graphql',
          },
        },
      });

      const configStaging = deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.staging,
      });

      expect(configStaging).toMatchObject({
        variant: ApolloEnvironmentVariant.staging,
        serviceName: 'testSuite',
        servicePort: 90210,

        cliArguments: {
          list: expect.stringMatching(/--tag=staging.+--endpoint=https:\/\/bliss-gateway-staging.withjoy.com\/testSuite\/graphql/),
          check: expect.stringMatching(/--tag=production.+--endpoint=https:\/\/bliss-gateway-staging.withjoy.com\/testSuite\/graphql/),
          push: expect.stringMatching(/--tag=staging.+--serviceURL=https:\/\/bliss-gateway-staging.withjoy.com\/graphql/),
        },
        schemaTags: {
          current: 'staging',
          future: 'production',
        },
        serviceConfig: {
          endpoint: {
            name: 'testSuite',
            url: 'https://bliss-gateway-staging.withjoy.com/testSuite/graphql',
          },
        },
      });
    });

    it('treats the Federating Service a bit differently', () => {
      const configLocal = deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.local,

        serviceName: 'stitch', // <= them's there's the Federator
      });

      expect(configLocal).toMatchObject({
        variant: ApolloEnvironmentVariant.local,
        serviceName: 'stitch',
        servicePort: 90210, // it('coerces the port into a Number')

        cliArguments: {
          list: expect.stringMatching(/--tag=development.+--endpoint=http:\/\/localhost:90210\/graphql/),
          check: expect.stringMatching(/--tag=development.+--endpoint=http:\/\/localhost:90210\/graphql/),
          push: expect.stringMatching(/--tag=development.+--serviceURL=https:\/\/bliss-gateway-dev.withjoy.com\/graphql/),
        },
        schemaTags: {
          current: 'development',
          future: 'development',
        },
        serviceConfig: {
          endpoint: {
            name: 'stitch',
            url: 'http://localhost:90210/graphql',
          },
        },
      });

      const configStaging = deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.staging,

        serviceName: 'stitch',
      });

      expect(configStaging).toMatchObject({
        variant: ApolloEnvironmentVariant.staging,
        serviceName: 'stitch',
        servicePort: 90210,

        cliArguments: {
          list: expect.stringMatching(/--tag=staging.+--endpoint=https:\/\/bliss-gateway-staging.withjoy.com\/graphql/),
          check: expect.stringMatching(/--tag=production.+--endpoint=https:\/\/bliss-gateway-staging.withjoy.com\/graphql/),
          push: expect.stringMatching(/--tag=staging.+--serviceURL=https:\/\/bliss-gateway-staging.withjoy.com\/graphql/),
        },
        schemaTags: {
          current: 'staging',
          future: 'production',
        },
        serviceConfig: {
          endpoint: {
            name: 'stitch',
            url: 'https://bliss-gateway-staging.withjoy.com/graphql',
          },
        },
      });
    });
  });
});
