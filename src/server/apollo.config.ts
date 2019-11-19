import { Config as ApolloServerConfig } from 'apollo-server';
import { EngineReportingOptions } from 'apollo-engine-reporting';
import { ServiceConfigFormat } from 'apollo-language-server';
import { telemetry } from '@withjoy/telemetry';


const FEDERATING_SERVICE_NAME = 'stitch';

function _cleanCLIArguments(args: string) {
  return args.trim().replace(/\s+/g, ' ');
}


export interface ApolloEnvironmentConfig {
  // like ApolloEnvironmentConfigArgs
  variant: ApolloEnvironmentVariant;
  serviceName: string,
  servicePort: number;

  apiKey: string;

  schemaTags: { // aka. the 'variant'
    current: string;
    future: string; // the next sequential environment
  };

  // for use in package.json 'script's
  cliArguments: {
    list: string; // https://github.com/apollographql/apollo-tooling#apollo-servicelist
    check: string; // https://github.com/apollographql/apollo-tooling#apollo-servicecheck
    push: string; // https://github.com/apollographql/apollo-tooling#apollo-servicepush
  };

  // https://www.apollographql.com/docs/apollo-server/api/apollo-server/
  //   not a complete set; only the things we can contribute to
  serverOptions: ApolloServerConfig;

  // https://www.apollographql.com/docs/apollo-server/api/apollo-server/#enginereportingoptions
  //   not a complete set; only the things we can contribute to
  engineReportingOptions: EngineReportingOptions<any>;

  // for use in `apollo.config.js`
  //   https://www.apollographql.com/docs/resources/apollo-config/
  serviceConfig: ServiceConfigFormat;
}


export enum ApolloEnvironmentVariant {
  local = 'local',
  development = 'development',
  staging = 'staging',
  production = 'production',
};

function _enumerateApolloEnvironmentVariant(variant: ApolloEnvironmentVariant | string): ApolloEnvironmentVariant | undefined {
  switch (variant) {
    case 'test':
    case 'ci':
    case 'local':
      return ApolloEnvironmentVariant.local;
    case 'development':
      return ApolloEnvironmentVariant.development;
    case 'staging':
      return ApolloEnvironmentVariant.staging;
    case 'production':
      return ApolloEnvironmentVariant.production;
    default:
      return undefined;
  }
}

export interface ApolloEnvironmentConfigArgs {
  variant?: ApolloEnvironmentVariant; // defaults to environment settings
  serviceName: string,
  servicePort: string | number;
};


export function deriveApolloEnvironmentConfig(args: ApolloEnvironmentConfigArgs): ApolloEnvironmentConfig {
  const serviceName = args.serviceName;
  const servicePort = parseInt(String(args.servicePort), 10);
  const isFederatingService = (serviceName === FEDERATING_SERVICE_NAME);
  const env = process.env;
  const apiKey = env.ENGINE_API_KEY || '';

  const variantAsString = args.variant || env.ENVIRONMENT || env.NODE_ENV || 'local';
  const variant = _enumerateApolloEnvironmentVariant(variantAsString);
  if (! variant) {
    throw new Error(`unrecognized variant: "${ variantAsString }"`);
  }

  const endpointRoute = (isFederatingService
    ? '/graphql'
    : `/${ serviceName }/graphql` // proxied by the Federating Service
  );

  const VARIANT_CONFIG: Record<string, any> = ({
    [ ApolloEnvironmentVariant.local ]: {
      // "The url of your service"
      //   from which your schema can be derived
      endpoint: {
        url: `http://localhost:${ servicePort }/graphql`, // provides the pending schema
        skipSSLValidation: true,
      },
      // "the url to the location of the implementing service for a federated graph"
      //   from which your schema can be derived
      federatingService: {
        url: 'https://bliss-gateway-dev.withjoy.com/graphql', // matches intention of { schemaTags }
        skipSSLValidation: true,
      },
      schemaTags: {
        current: 'development', // there is no 'local'
        future: 'development',
      },
      serverOptions: {
        debug: true,
        introspection: true,
        mocks: false,
        playground: true,
        subscriptions: false, // string | false | Partial<SubscriptionServerOptions> | undefined
        tracing: true,
      },
    },
    [ ApolloEnvironmentVariant.development ]: {
      endpoint: {
        url: `https://bliss-gateway-dev.withjoy.com${ endpointRoute }`,
        skipSSLValidation: false,
      },
      federatingService: {
        url: 'https://bliss-gateway-dev.withjoy.com/graphql',
        skipSSLValidation: true,
      },
      schemaTags: {
        current: 'development',
        future: 'staging',
      },
      serverOptions: {
        debug: true,
        introspection: true,
        mocks: false,
        playground: true,
        subscriptions: false,
        tracing: true,
      },
    },
    [ ApolloEnvironmentVariant.staging ]: {
      endpoint: {
        url: `https://bliss-gateway-staging.withjoy.com${ endpointRoute }`,
        skipSSLValidation: false,
      },
      federatingService: {
        url: 'https://bliss-gateway-staging.withjoy.com/graphql',
        skipSSLValidation: false,
      },
      schemaTags: {
        current: 'staging',
        future: 'production',
      },
      serverOptions: {
        debug: true,
        introspection: true,
        mocks: false,
        playground: true,
        subscriptions: false,
        tracing: true,
      },
    },
    [ ApolloEnvironmentVariant.production ]: {
      endpoint: {
        url: `https://bliss-gateway-prod.withjoy.com${ endpointRoute }`,
        skipSSLValidation: false,
      },
      federatingService: {
        url: 'https://bliss-gateway-prod.withjoy.com/graphql',
        skipSSLValidation: false,
      },
      schemaTags: {
        current: 'production',
        future: 'production', // 'production' is as far as we go
      },
      serverOptions: {
        debug: false,
        introspection: true,
        mocks: false,
        playground: false,
        subscriptions: false,
        tracing: true,
      },
    },
  } as Record<ApolloEnvironmentVariant, any>)[
    variant // Object lookup
  ];

  const endpointUrl = VARIANT_CONFIG.endpoint.url;
  const derived = {
    variant,
    serviceName,
    servicePort,

    apiKey,
    schemaTags: VARIANT_CONFIG.schemaTags,
    cliArguments: {
      list: _cleanCLIArguments(`
        --key=${ apiKey }
        --tag=${ VARIANT_CONFIG.schemaTags.current }
        --endpoint=${ endpointUrl }
      `),
      check: _cleanCLIArguments(`
        --key=${ apiKey }
        --serviceName=${ serviceName }
        --tag=${ VARIANT_CONFIG.schemaTags.future }
        --endpoint=${ endpointUrl }
      `),
      push: _cleanCLIArguments(`
        --key=${ apiKey }
        --serviceName=${ serviceName }
        --tag=${ VARIANT_CONFIG.schemaTags.current }
        --endpoint=${ endpointUrl }
        --serviceURL=${ VARIANT_CONFIG.federatingService.url }
      `),
    },

    serverOptions: {
      ...VARIANT_CONFIG.serverOptions,

      // https://www.apollographql.com/docs/apollo-server/federation/metrics/#turning-it-on
      //   "ensure that implementing services do not report metrics"
      //   the Federating service will want to override the { engine } config
      // https://www.apollographql.com/docs/graph-manager/federation/#metrics-and-observability
      //   "ensure that federated services do not have the ENGINE_API_KEY environment variable set"
      //   fortunately, { engine: false } neutralizes that concern
      engine: false,
      reporting: false,
    },

    engineReportingOptions: {
      apiKey,
      schemaTag: VARIANT_CONFIG.schemaTags.current,
    },

    serviceConfig: {
      endpoint: {
        name: serviceName,
        url: endpointUrl,
        skipSSLValidation: VARIANT_CONFIG.endpoint.skipSSLValidation,
      },
      localSchemaFile: undefined,
      includes: [], // required, empty => use defaults
      excludes: [],
    },
  };

  telemetry.info('deriveApolloEnvironmentConfig', {
    source: 'apollo',
    action: 'config',

    variant,
    serviceName,
    servicePort,
    endpointUrl,
  });
  return derived;
}
