import { get as getProperty, isNil, omitBy, pick } from 'lodash';
import { DocumentNode } from 'graphql';
import gql from 'graphql-tag';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { default as CacheManager, Cache } from 'cache-manager';
import {
  Telemetry,
  telemetry as telemetrySingleton,
  deriveTelemetryContextFromRequest,
  enrichTelemetryContext,
  deriveTelemetryContextFromError,
  deriveTelemetryHeadersFromContext,
} from '@withjoy/telemetry';

import {
  NO_USER,
  NO_TOKEN,
  deriveTokenHeaderValue,
} from '../authentication/token.check';
import { decodeUnverifiedToken } from '../authentication/verify.token';
import { callService, IServiceCallerOverrides } from '../graphql/interservice.communication';
import { GetMe, UserFragment } from '../graphql/generated.typings';
import { SESSION_REQUEST_PROPERTY, SESSION_HEADER_NAME } from '../middleware/session';
import { deriveRemoteAddress } from '../utils/remoteAddress';
import { isHealthCheckRoute } from '../utils/healthCheck';


const EMPTY_ARRAY = Object.freeze([]);
const SAFE_JWT_PROPERTIES = [
  'exp', // expires at
  'iat', // issued at
  'sub', // subject
  // everything else is secret-ish
];

const USER = gql`
  fragment UserFragment on User {
    id
    firstName
    lastName
    superAdmin
    email
    aliases {
      id
      provider
      auth0
      firstName
      lastName
      email
    }
  }
`;

const IDENTITY_ME = gql`
  ${USER}
  query GetMeApolloContext {
    me {
      ...UserFragment
    }
  }
`;

export const TRUSTED_REQUEST_HEADER_NAME = "X-Joy-APISecret";

// singleton Cache, across all Context instances
//   UserFragments are not expected to change very often
//   so we can assume a long-lived cache
const IDENTITY_CACHE_TTL: number = 5 * 60; // 5min
const IDENTITY_CACHE: Cache = CacheManager.caching({
  store: 'memory',
  ttl: IDENTITY_CACHE_TTL,
  max: 2048, // UserFragments? let's not go overboard with those
  isCacheableValue(value) {
    // keep looking until we find you -- you'll be there eventually
    return ((value !== undefined) && (value !== null));
  },
});


export function logContextRequest(context: Context): void {
  const req = context.req!;
  if (! req) {
    return;
  }

  const { telemetry, sessionId, remoteAddress } = context;
  const { hostname: host, method, body } = req;
  const path = (req.baseUrl || req.path); // GraphQL middleware does a rewrite
  if (isHealthCheckRoute(path)) {
    // health checks should not spam the logs
    return;
  }

  const operations: Record<string, any>[] = [];
  if (method.toUpperCase() === 'POST') {
    let query: DocumentNode | undefined = undefined;
    try {
      // this will give us something similar to GraphQLResolveInfo
      //   assuming there's a query *and* its value is parseable GraphQL
      query = gql`${ body.query }`;
    }
    catch (err) { }

    // a high-level sketch of the GraphQL request
    (getProperty(query, 'definitions') || EMPTY_ARRAY).forEach((definition: Record<string, any>): void => {
      const { operation } = definition;
      if ((operation !== 'query') && (operation !== 'mutation')) {
        return; // omit inline Fragments, etc.
      }

      const definitionName = getProperty(definition, 'name.value');

      (getProperty(definition, 'selectionSet.selections') || EMPTY_ARRAY).forEach((selection: Record<string, any>): void => {
        const selectionName = getProperty(selection, 'name.value');

        operations.push({
          definitionName,
          operation,
          selectionName,
        });
      });
    });
  }

  const logged: Record<string, any> = {
    source: 'apollo',
    action: 'request',

    // (in a structure similar to `_morganFormatter`)
    host, // HTTP requested host (vs. physical hostname)
    method,
    path,
    sessionId,
  };

  if (remoteAddress) {
    logged.remoteAddress = remoteAddress;
  }

  if (operations.length !== 0) {
    logged.graphql = {
      operations: JSON.stringify(operations),
    };
  }

  telemetry.info('logContextRequest', logged);
}

export type InjectContextIntoRequestFactory<T extends Context = Context> = (constructorArgs: ContextConstructorArgs) => T;

export function injectContextIntoRequestMiddleware<T extends Context = Context>(contextFactory: InjectContextIntoRequestFactory<T>): RequestHandler {
  // an Express middleware to associate Request <=> Context
  //   for use in both Apollo GraphQL and REST endpoints.
  // having this association is important to other core methods,
  //   eg. `_morganFormatter` having access to contextual Telemetry
  return function injectContextIntoRequest(req: Request, res: Response, next: NextFunction) {
    const reqAsAny: any = <any>req;
    const { token, userId } = reqAsAny; // either may be missing
    const context = contextFactory({
      req,
      token,
      userId,
    });

    // the association that Apollo's `context` callback would normally handle for us
    reqAsAny.context = context;

    next();
  }
}

export function deriveContextFromRequest<T extends Context = Context>(req: Request): T | undefined {
  // to formalize some of the annoying boilerplate
  const context = (<any>req).context;
  return (context ? (context as T) : undefined);
}


export interface IContext {
  req: Request | undefined;
  token: string;
  userId: string;
  locale: string;
  identityUrl: string | undefined;
  identityCache: Cache | null;
  identityCacheTtl: number;
  // computed
  currentUser: UserFragment | undefined;
  remoteAddress: string | undefined;
  me: () => void;
}

export interface ContextConstructorArgs {
  req?: Request;
  token?: string;
  userId?: string;
  locale?: string;
  identityUrl?: string;
  identityCache?: Cache | null; // `null` to disable
  identityCacheTtl?: number;
  trustSecret?: string;
}

export class Context
  implements IContext, ContextConstructorArgs // instances can be used as contructor args
{
  public readonly req: Request | undefined;
  public readonly telemetry: Telemetry;
  public readonly identityUrl: string | undefined;
  public readonly identityCache: Cache | null;
  public readonly identityCacheTtl: number;
  public readonly locale: string;
  public readonly remoteAddress: string | undefined;
  public readonly isTrustedRequest: boolean;

  // "why readonly?  why not a getter?"
  //   https://github.com/apollographql/apollo-server/blob/main/packages/apollo-server-core/src/runHttpQuery.ts#L254
  //   "// TODO: We currently shallow clone the context for every request,"
  //   and their `cloneObject` doesn't seem to consider getters.
  //   from experience, it doesn't even seem to deal with `Reflect.setProperty` correctly :( .
  //   since callers shouldn't modify these Context properties, a getter seemed natural,
  //   but direct value assignment is the *only* Test Suite mocking method that works.
  //   since `readonly` works on an honor system, we can enforce that via TypeScript,
  //   while still mocking it as needed within a Test Suite (eg. SinonSandbox#replace).
  public readonly token: string;
  public readonly currentAuth0Id:  string | undefined;
  public readonly currentUser: UserFragment | undefined;
  public readonly userId: string;
  public readonly sessionId:  string | undefined;
  public readonly isSuperAdmin:  boolean;
  public readonly isAuthenticated:  boolean;
  public readonly isIdentifed:  boolean;

  private _trustSecret?: string;

  constructor(args?: ContextConstructorArgs) {
    this.telemetry = telemetrySingleton.clone();
    const telemetryContext = this.telemetry.context(); // to be mutated in-place

    // defaults
    this.identityCache = IDENTITY_CACHE;
    this.identityCacheTtl = IDENTITY_CACHE_TTL;
    this.locale = 'en_US';
    this.token = NO_TOKEN;
    this.userId = NO_USER;

    if (args) {
      const {
        req,
        token,
        userId,
        identityUrl,
        identityCache,
        identityCacheTtl,
        locale,
        trustSecret,
      } = args;
      const reqAsAny = (<any>req);

      this.req = req;
      this.locale = locale || this.locale;

      this.identityUrl = identityUrl;
      this.identityCache = ((identityCache === null)
        ? null // disabled
        : (identityCache || this.identityCache)
      );
      if (identityCacheTtl !== undefined) {
        this.identityCacheTtl = identityCacheTtl;
      }

      // TODO:  derive `locale`
      //   @mcorrigan: "a header in stitch service in the future"
      //   Accept-Language header, if present
      //   can we derive it from `context.currentUser`?

      // precedence
      //   (1) what we were given
      //   (2) what we can inherit or derive with minimum effort
      //   (3) defaults
      this.token = token || (reqAsAny && reqAsAny.token) || deriveTokenHeaderValue(req) || this.token;
      this.userId = userId || (reqAsAny && reqAsAny.userId) || this.userId;
      this._trustSecret = trustSecret;

      // enrich Telemetry from request headers
      Object.assign(telemetryContext, deriveTelemetryContextFromRequest(req));
    }

    enrichTelemetryContext(telemetryContext); // back-fill the rest

    // provide Telemetry introspection into live state;
    //   we have little control over how sub-Classes will mutate these values
    //   but they are critical for debugging.
    //   NOTE: Telemetry does a deep merge; { req: { foo } }
    const context = this;
    telemetryContext.req = {
      get sessionId() { return context.sessionId },
      get token() { return context.token },
      get userId() { return context.userId },
      get jwt() {
        const decoded = decodeUnverifiedToken(context.token);
        return decoded && pick(decoded, SAFE_JWT_PROPERTIES);
      },
    };

    // and some final wrap-up
    this.remoteAddress = deriveRemoteAddress(this.req);

    // Apollo shallow clones context which breaks getters so move assignment here
    this._updateUser(this.userId, undefined);
    this.currentAuth0Id = this._currentAuth0Id();
    this.isTrustedRequest = this._isTrustedRequest();
    this.sessionId = getProperty(this.req, SESSION_REQUEST_PROPERTY);
  }


  private _updateUser(userId: string, userFragment: UserFragment | undefined): void {
    // We want these to by typed readonly to the outside world,
    // but we still need to update them dynamically inside this class
    (this.userId as string) = userId;
    (this.currentUser as UserFragment | undefined) = userFragment;

    (this.isSuperAdmin as boolean) = getProperty(this.currentUser, 'superAdmin') || false;
    (this.isAuthenticated as boolean) = (this.userId && (this.userId !== NO_USER)) || false;
    (this.isIdentifed as boolean) = Boolean(this.currentUser);
  }

  private _currentAuth0Id(): string | undefined {
    const { token } = this;
    if ((! token) || (token === NO_TOKEN)) {
      return undefined;
    }
    const decoded = decodeUnverifiedToken(token);
    return getProperty(decoded, 'sub'); // it's Subject
  }

  private _isTrustedRequest(): boolean {
    const { req, _trustSecret } = this;

    if (!req || !_trustSecret) {
      return false;
    }

    return (req.header(TRUSTED_REQUEST_HEADER_NAME) === _trustSecret);
  }


  get identityCacheEnabled(): Boolean {
    return (this.identityCache !== null);
  }

  public me = async (overrides?: IServiceCallerOverrides): Promise<void> => {
    const {
      identityCacheEnabled,
      identityCache,
      identityCacheTtl,
    } = this;

    let userFragment: UserFragment | undefined;
    if (! identityCacheEnabled) {
      userFragment = await this.fetchIdentityUser(overrides);
    }
    else {
      // thru the Cache
      const token = (overrides && overrides.token) || this.token;
      const cacheKey = `server-core/identity/${ token }`;

      userFragment = await identityCache!.wrap(
        cacheKey,
        () => this.fetchIdentityUser(overrides),
        // apparently you have to specify { ttl } every time for it to work properly,
        //   even if the Cache is pre-configured with a TTL
        { ttl: identityCacheTtl }
      );
    }
    if (! userFragment) {
      return;
    }

    // establish our state
    this._updateUser(userFragment.id, userFragment);
  }

  public fetchIdentityUser = async (overrides?: IServiceCallerOverrides): Promise<UserFragment | undefined> => {
    const { identityUrl } = this;
    if (! identityUrl) {
      return undefined;
    }

    // pass along Telemetry headers
    const { telemetry } = this;
    const telemetryHeaders = deriveTelemetryHeadersFromContext(telemetry.context());

    const token = (overrides && overrides.token) || this.token;
    const headers = omitBy({
      ...telemetryHeaders,
      [ SESSION_HEADER_NAME ]: this.sessionId,
      ...overrides?.headers,
    }, isNil);

    try {
      const result = await callService<GetMe>(
        identityUrl,
        token,
        IDENTITY_ME,
        undefined, // no variables
        headers
      );
      if (! result) {
        throw new Error('received empty result from Service');
      }

      const { data } = result;
      if (data && data.me) {
        return data.me;
      }
    }
    catch (err) {
      telemetry.error('Context#me', {
        ...deriveTelemetryContextFromError(err),
        identityUrl,
        token,
      });
    }

    return undefined;
  }
}

export const createContext = <T>(context?: T): T | Context => {
  if (context) {
    return context;
  } else {
    return new Context();
  }
}
