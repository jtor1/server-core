import { identity } from 'lodash';
import { Config as ApolloServerConfig } from 'apollo-server';
import { EngineReportingOptions } from 'apollo-engine-reporting';
import { ServiceConfigFormat } from 'apollo-language-server';
import { telemetry } from '@withjoy/telemetry';

/*
  Apollo Tooling for Gateway Services
    https://withjoy.atlassian.net/wiki/spaces/KNOW/pages/729415844/Apollo+Tooling+for+Gateway+Services
*/


const SERVER_OPTIONS_DEFAULT = Object.freeze({
  // https://www.apollographql.com/docs/apollo-server/api/apollo-server/
  //   defaults are meant for Production
  cacheControl: true, // "This is primarily intended for use with the deprecated Engine proxy."
  cors: false, // @see `getDefaultMiddleware`
  debug: false,
  // https://www.apollographql.com/docs/apollo-server/federation/metrics/#turning-it-on
  //   "ensure that implementing services do not report metrics"
  //   eg. default behavior = no reporting
  //   the Federating service will need to override the { engine } config
  engine: false,
  introspection: true,
  mocks: false,
  playground: false,
  subscriptions: false, // string | false | Partial<SubscriptionServerOptions> | undefined
  reporting: false, // @see { engine }
  tracing: true, // "This is primarily intended for use with the deprecated Engine proxy."
});
const FEDERATING_SERVICE_NAME = 'stitch';

function _makeCLIArgs(lines: string[]) {
  return lines.filter(identity).join(' ').trim();
}


type ApolloEnvironmentVariantName = 'development' | 'staging' | 'production';  // only registered Variants

export interface ApolloEnvironmentConfig {
  // like ApolloEnvironmentConfigArgs
  variant: ApolloEnvironmentVariant;
  serviceName: string,
  servicePort: number;

  apiKey: string;

  graphVariants: {
    current: ApolloEnvironmentVariantName;
    future: ApolloEnvironmentVariantName; // the next sequential environment
  };

  // for use in package.json 'script's
  cliArguments: {
    list: string; // "who are my peer registered Services?"
    check: string; // "how does the deployed schema fare against Production traffic?"
    diff: string; // "what's different between the deployed schema and what was last published?"
    push: string; // "publish the deployed schema"
  };

  // https://www.apollographql.com/docs/apollo-server/api/apollo-server/
  //   not a complete set; only the things we can contribute to
  serverOptions: ApolloServerConfig;

  // https://www.apollographql.com/docs/apollo-server/api/apollo-server/#enginereportingoptions
  //   not a complete set; only the things we can contribute to
  engineReportingOptions: EngineReportingOptions<any>;

  // for use in `apollo.config.js`
  //   https://www.apollographql.com/docs/devtools/apollo-config/
  serviceConfig: ServiceConfigFormat;
}


export enum ApolloEnvironmentVariant {
  local = 'local',  // it's not a Variant registered with Apollo, but it is a valid Environment
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

  // our Apollo API Key
  //   FIXME:  deprecate ENGINE_API_KEY
  //   "[deprecated] The `ENGINE_API_KEY` environment variable has been renamed to `APOLLO_KEY`."
  const apiKey = env.APOLLO_KEY || env.ENGINE_API_KEY || '';

  if (! isFederatingService) {
    // https://www.apollographql.com/docs/graph-manager/federation/#metrics-and-observability
    //   "ensure that federated services do not have the APOLLO_KEY environment variable set"
    //   "You should only configure your Apollo gateway to report metrics to Apollo Graph Manager."
    // however, a service codebase *does* need the APOLLO_KEY,
    //   for tooling -- eg. `serviceConfig` + `cliArguments below` -- but not while "serving"
    //   unfortunately, `{ engine: false }` does not help here
    // also, the Federating Service needs it to be retained
    env.APOLLO_KEY = '';
    env.ENGINE_API_KEY = '';
  }

  const variantAsString = args.variant || env.ENVIRONMENT || env.NODE_ENV || 'local';
  const variant = _enumerateApolloEnvironmentVariant(variantAsString);
  if (! variant) {
    throw new Error(`unrecognized variant: "${ variantAsString }"`);
  }

  const isLocalVariant = (variant === ApolloEnvironmentVariant.local);
  const endpointRoute = (isFederatingService
    ? '/graphql'
    : `/${ serviceName }/graphql` // proxied by the Federating Service
  );

  // the current Variant
  const VARIANT_CONFIG: Record<string, any> = ({
    [ ApolloEnvironmentVariant.local ]: {
      // "The url of your service"
      //   from which your schema can be derived
      endpoint: {
        url: `http://localhost:${ servicePort }/graphql`, // provides the deployed schema
        skipSSLValidation: true,
      },
      // "the url to the location of the implementing service for a federated graph"
      //   from which your schema can be derived
      federatingService: {
        url: 'https://bliss-gateway-dev.withjoy.com/graphql', // matches intention of { graphVariants }
        skipSSLValidation: true,
      },
      graphVariants: {
        current: 'development', // 'local' isn't a registered Variant
        future: 'development',
      },
      serverOptions: {
        ...SERVER_OPTIONS_DEFAULT,
        debug: true,
        playground: true,
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
      graphVariants: {
        current: 'development',
        future: 'staging',
      },
      serverOptions: {
        ...SERVER_OPTIONS_DEFAULT,
        debug: true,
        playground: true,
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
      graphVariants: {
        current: 'staging',
        future: 'production',
      },
      serverOptions: {
        ...SERVER_OPTIONS_DEFAULT,
        debug: true,
        playground: true,
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
      graphVariants: {
        current: 'production',
        future: 'production', // 'production' is as far as we go
      },
      serverOptions: SERVER_OPTIONS_DEFAULT,
    },
  } as Record<ApolloEnvironmentVariant, any>)[
    variant // Object lookup
  ];

  const endpointUrl = VARIANT_CONFIG.endpoint.url;
  const derived: ApolloEnvironmentConfig = {
    variant,
    serviceName,
    servicePort,

    apiKey,
    graphVariants: VARIANT_CONFIG.graphVariants,
    cliArguments: {
      // "who are my peer registered Services?"
      //   `apollo service:list` for current Environment
      //   https://github.com/apollographql/apollo-tooling#apollo-servicelist
      list: _makeCLIArgs([
        `--key=${ apiKey }`,
        `--variant=${ VARIANT_CONFIG.graphVariants.current }`,
        `--endpoint=${ endpointUrl }`,
      ]),

      // "how does the deployed schema fare against Production traffic?"
      //   eg. "would this schema break Production?"
      //   `apollo service:check` of *current* Environment against Production
      //   https://github.com/apollographql/apollo-tooling#apollo-servicecheck
      check: _makeCLIArgs([
        `--key=${ apiKey }`,
        `--variant=${ ApolloEnvironmentVariant.production }`,
        `--endpoint=${ endpointUrl }`,
        // you *can* check the schema from the Federating Service perspective;
        //   it'll check the federated schema as a whole.
        //   the Federating Service exposes its schema as the 'default' service, so no `serviceName`
        (isFederatingService ? '' : `--serviceName=${ serviceName }`),
      ]),

      // "what's different between the deployed schema and what was last published?"
      //   `apollo service:check` against *current* Environment
      //   https://github.com/apollographql/apollo-tooling#apollo-servicecheck
      diff: _makeCLIArgs([
        `--key=${ apiKey }`,
        `--variant=${ VARIANT_CONFIG.graphVariants.current }`,
        `--endpoint=${ endpointUrl }`,
        (isFederatingService ? '' : `--serviceName=${ serviceName }`),
      ]),

      // "publish the deployed schema"
      //   `apollo service:push` to *current* Environment
      //   https://github.com/apollographql/apollo-tooling#apollo-servicepush
      push: _makeCLIArgs((isLocalVariant || isFederatingService)
        // you *cannot* push a schema from your 'local' environment;
        //   in theory, it *could* go to 'development' ...
        //   but we'd prefer that it get deployed there first
        // you *cannot* push the Federating Service's schema;
        //   you can only push the schema for the individual Services.
        //   "The model of the service registry is that the graph's schema is computed by composing underlying services."
        ? [] // => "Error: No service found to link to Engine" (because you should never do this)
        : [
          `--key=${ apiKey }`,
          `--variant=${ VARIANT_CONFIG.graphVariants.current }`,
          `--endpoint=${ endpointUrl }`,
          `--serviceURL=${ VARIANT_CONFIG.federatingService.url }`,
          `--serviceName=${ serviceName }`,
        ]
      ),
    },

    serverOptions: VARIANT_CONFIG.serverOptions,

    engineReportingOptions: {
      apiKey,
      // // FIXME:  rename
      // //   "[deprecated] The `schemaTag` property within `engine` configuration has been renamed to `graphVariant`."
      // //   "Error: Cannot set both engine.graphVariant and engine.schemaTag. Please use engine.graphVariant."
      // graphVariant: VARIANT_CONFIG.graphVariants.current,
      schemaTag: VARIANT_CONFIG.graphVariants.current,
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
