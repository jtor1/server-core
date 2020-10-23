import {
  ApolloEnvironmentConfig,
  ApolloEnvironmentConfigArgs,
  ApolloEnvironmentVariant,
  deriveApolloEnvironmentConfig,
} from './apollo.config';


const API_KEY = 'API_KEY';
const DEFAULT_CONFIG_ARGS: ApolloEnvironmentConfigArgs = {
  serviceName: 'testSuite',
  servicePort: '90210',
};


describe('server/apollo.config', () => {
  let env: Record<string, any>;

  function _setupVolatile() {
    // things everyone needs
    //   yet which are volatile:  it('blanks the Apollo API Key in the environment')
    process.env.APOLLO_KEY = API_KEY;

    // FIXME:  deprecate ENGINE_API_KEY
    delete process.env.ENGINE_API_KEY;
  }

  beforeEach(() => {
    env = Object.assign({}, process.env);

    _setupVolatile();
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

    it('blanks the Apollo API Key in the environment', () => {
      let config: ApolloEnvironmentConfig;

      config = deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.local,
      });

      expect(config.apiKey).toBe(API_KEY);
      expect(process.env.APOLLO_KEY).toBe('');
      expect(process.env.ENGINE_API_KEY).toBe('');

      // it('honors the legacy ENGINE_API_KEY')
      //   FIXME:  deprecate ENGINE_API_KEY
      process.env.ENGINE_API_KEY = API_KEY;
      deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.local,
      });

      expect(config.apiKey).toBe(API_KEY);
      expect(process.env.APOLLO_KEY).toBe('');
      expect(process.env.ENGINE_API_KEY).toBe('');

      // it('does *not* blank the Apollo API Key for the Federating Service')
      _setupVolatile();
      deriveApolloEnvironmentConfig({
        ...DEFAULT_CONFIG_ARGS,
        variant: ApolloEnvironmentVariant.local,

        serviceName: 'stitch', // <= them's there's the Federator
      });

      expect(config.apiKey).toBe(API_KEY);
      expect(process.env.APOLLO_KEY).toBe(API_KEY);
      expect(process.env.ENGINE_API_KEY).toBeUndefined();
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
          //   you cannot push from your local environment
          list: '--key=API_KEY --variant=development --endpoint=http://localhost:90210/graphql',
          check: '--key=API_KEY --variant=production --endpoint=http://localhost:90210/graphql --serviceName=testSuite',
          diff: '--key=API_KEY --variant=development --endpoint=http://localhost:90210/graphql --serviceName=testSuite',
          push: '',
        },
        graphVariants: {
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

      _setupVolatile();
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
          list: '--key=API_KEY --variant=staging --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql',
          check: '--key=API_KEY --variant=production --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql --serviceName=testSuite',
          diff: '--key=API_KEY --variant=staging --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql --serviceName=testSuite',
          push: '--key=API_KEY --variant=staging --endpoint=https://bliss-gateway-staging.withjoy.com/testSuite/graphql --serviceURL=https://bliss-gateway-staging.withjoy.com/graphql --serviceName=testSuite',
        },
        graphVariants: {
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
          //   you can check the Federated schema, but you cannot push
          list: '--key=API_KEY --variant=development --endpoint=http://localhost:90210/graphql',
          check: '--key=API_KEY --variant=production --endpoint=http://localhost:90210/graphql',
          diff: '--key=API_KEY --variant=development --endpoint=http://localhost:90210/graphql',
          push: '',
        },
        graphVariants: {
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

      _setupVolatile();
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
          //   you can check the Federated schema, but you cannot push
          list: '--key=API_KEY --variant=staging --endpoint=https://bliss-gateway-staging.withjoy.com/graphql',
          check: '--key=API_KEY --variant=production --endpoint=https://bliss-gateway-staging.withjoy.com/graphql',
          diff: '--key=API_KEY --variant=staging --endpoint=https://bliss-gateway-staging.withjoy.com/graphql',
          push: '',
        },
        graphVariants: {
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


    describe('per the variant', () => {
      // for "less subtle" configuration sections not covered above

      it('provides a local configuration', () => {
        const config = deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: ApolloEnvironmentVariant.local,
        });

        expect(config).toMatchObject({
          variant: ApolloEnvironmentVariant.local,

          apiKey: API_KEY,
          engineReportingOptions: {
            apiKey: API_KEY,
            schemaTag: 'development',
          },
          serverOptions: {
            cors: false,
            debug: true,
            engine: false,
            introspection: true,
            mocks: false,
            playground: true,
            reporting: false,
            subscriptions: false,
            tracing: true,
          },
        });
      });

      it('provides a development configuration', () => {
        const config = deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: ApolloEnvironmentVariant.development,
        });

        expect(config).toMatchObject({
          variant: ApolloEnvironmentVariant.development,

          apiKey: API_KEY,
          engineReportingOptions: {
            apiKey: API_KEY,
            schemaTag: 'development',
          },
          serverOptions: {
            cors: false,
            debug: true,
            engine: false,
            introspection: true,
            mocks: false,
            playground: true,
            reporting: false,
            subscriptions: false,
            tracing: true,
          },
        });
      });

      it('provides a staging configuration', () => {
        const config = deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: ApolloEnvironmentVariant.staging,
        });

        expect(config).toMatchObject({
          variant: ApolloEnvironmentVariant.staging,

          apiKey: API_KEY,
          engineReportingOptions: {
            apiKey: API_KEY,
            schemaTag: 'staging',
          },
          serverOptions: {
            cors: false,
            debug: true,
            engine: false,
            introspection: true,
            mocks: false,
            playground: true,
            reporting: false,
            subscriptions: false,
            tracing: true,
          },
        });
      });

      it('provides a production configuration', () => {
        const config = deriveApolloEnvironmentConfig({
          ...DEFAULT_CONFIG_ARGS,
          variant: ApolloEnvironmentVariant.production,
        });

        expect(config).toMatchObject({
          variant: ApolloEnvironmentVariant.production,

          apiKey: API_KEY,
          engineReportingOptions: {
            apiKey: API_KEY,
            schemaTag: 'production',
          },
          serverOptions: {
            cors: false,
            debug: false,
            engine: false,
            introspection: true,
            mocks: false,
            playground: false,
            reporting: false,
            subscriptions: false,
            tracing: true,
          },
        });
      });
    });
  });
});
