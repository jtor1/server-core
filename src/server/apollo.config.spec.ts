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

    // things everyone needs
    process.env.ENGINE_API_KEY = 'ENGINE_API_KEY';
  });

  afterEach(() => {
    Object.assign(process.env, env);
  });


  describe('deriveApolloEnvironmentConfig', () => {
    it('expects known variants and translates some of them', () => {
      [
        // it('does some translation for Test-related environments')
        { asString: 'test', asEnum: ApolloEnvironmentVariant.local },
        { asString: 'ci', asEnum: ApolloEnvironmentVariant.local },

        { asString: 'local', asEnum: ApolloEnvironmentVariant.local },
        { asString: 'development', asEnum: ApolloEnvironmentVariant.development },
        { asString: 'staging', asEnum: ApolloEnvironmentVariant.staging },
        { asString: 'production', asEnum: ApolloEnvironmentVariant.production },
      ]
      .forEach(({ asString, asEnum }) => {
        const config = deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: <ApolloEnvironmentVariant>asString,
        });

        expect(config.variant).toBe(asEnum);
      });
    });

    it('hates all over an unknown variant', () => {
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
          // expectations:
          //   specify your Service name
          //   consume the schema from your local Service
          //   current variant = 'development'
          //   future variant = 'development'
          list: '--key=ENGINE_API_KEY --tag=development --endpoint=http://localhost:90210/graphql',
          check: '--key=ENGINE_API_KEY --tag=development --endpoint=http://localhost:90210/graphql --serviceName=testSuite',
          push: '--key=ENGINE_API_KEY --tag=development --endpoint=http://localhost:90210/graphql --serviceURL=https://bliss-gateway-dev.withjoy.com/graphql --serviceName=testSuite',
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
          // expectations:
          //   specify your Service name
          //   consume the schema from the Service code deployed to Staging, as proxied by the Federating Service
          //   current variant = 'staging'
          //   future variant = 'production'
          list: '--key=ENGINE_API_KEY --tag=staging --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql',
          check: '--key=ENGINE_API_KEY --tag=production --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql --serviceName=testSuite',
          push: '--key=ENGINE_API_KEY --tag=staging --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql --serviceURL=https://bliss-gateway-staging.withjoy.com/graphql --serviceName=testSuite',
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
          // expectations:
          //   no Service name; the Federating Service registers its schema as the 'default' service
          //   consume the schema from your local Service
          //   current variant = 'development'
          //   future variant = 'development'
          //   you can check the Federated schema, but you cannot push
          list: '--key=ENGINE_API_KEY --tag=development --endpoint=http://localhost:90210/graphql',
          check: '--key=ENGINE_API_KEY --tag=development --endpoint=http://localhost:90210/graphql',
          push: '',
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

        serviceName: 'stitch', // the Federator
      });

      expect(configStaging).toMatchObject({
        variant: ApolloEnvironmentVariant.staging,
        serviceName: 'stitch',
        servicePort: 90210,

        cliArguments: {
          // expectations:
          //   no Service name; the Federating Service registers its schema as the 'default' service
          //   consume the Federated schema from the Service code deployed to Staging
          //   current variant = 'staging'
          //   future variant = 'production'
          //   you can check the Federated schema, but you cannot push
          list: '--key=ENGINE_API_KEY --tag=staging --endpoint=https://bliss-gateway-staging.withjoy.com/graphql',
          check: '--key=ENGINE_API_KEY --tag=production --endpoint=https://bliss-gateway-staging.withjoy.com/graphql',
          push: '',
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

    it('can be asked to always consume the schema from your local Service', () => {
      const configStaging = deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.staging,

        serviceName: 'testCase',
        useLocalEndpoint: true,
      });

      expect(configStaging).toMatchObject({
        variant: ApolloEnvironmentVariant.staging,
        serviceName: 'testCase',
        servicePort: 90210,

        cliArguments: {
          // expectations:
          //   no Service name; the Federating Service registers its schema as the 'default' service
          //   consume the Federated schema from the Service code deployed to Staging
          //   current variant = 'staging'
          //   future variant = 'production'
          list: '--key=ENGINE_API_KEY --tag=staging --endpoint=http://localhost:90210/graphql',
          check: '--key=ENGINE_API_KEY --tag=production --endpoint=http://localhost:90210/graphql --serviceName=testCase',
          push: '--key=ENGINE_API_KEY --tag=staging --endpoint=http://localhost:90210/graphql --serviceURL=https://bliss-gateway-staging.withjoy.com/graphql --serviceName=testCase',
        },
        schemaTags: {
          current: 'staging',
          future: 'production',
        },
        serviceConfig: {
          endpoint: {
            name: 'testCase',
            url: 'http://localhost:90210/graphql',
          },
        },
      });
    });
  });
});
