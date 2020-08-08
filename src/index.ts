import { VERSION } from './utils/const';
import {
  Context,
  IContext,
  ContextConstructorArgs,
  createContext,
  logContextRequest,
  injectContextIntoRequestMiddleware,
} from './server/apollo.context'
import {
  ApolloEnvironmentConfig,
  ApolloEnvironmentVariant,
  deriveApolloEnvironmentConfig,
} from './server/apollo.config'
import { IApolloServerArgs, createApolloServer } from './server/apollo.server'
import { IServer, Server } from './server/server'
import { initApp } from './server/server.init';
import { bodyParserGraphql } from './middleware/body.parser';
import { getDefaultMiddleware } from './middleware/defaults';
import {
  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,
} from './middleware/session';
import {
  NO_USER,
  NO_TOKEN,
  deriveTokenHeaderValue,
  tokenCheck,
} from './authentication/token.check';
import { TokenConfig, verifyAll } from './authentication/verify.token';
import {
  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError
} from './server/errors';

import { ControllerTemplate } from './templates/controller.template';
import { ModelViewTemplate, ViewTemplate } from './templates/view.template';
import { ModelTemplate, ModelTemplateClass } from './templates/model.template';
import {
  coreResolvers,
  coreTypeDefs,
  CoreTypeDate,
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
} from './graphql/core.types'
import { createGraphQLEnumValues } from './utils/graphql.enum';
import { EdgeWrapper, edgeWrapperType } from './utils/edge.wrapper';
import {
  LivestreamUrlParseResult,
  LivestreamUrlProvider,
  livestreamGraphQL,
  parseLivestreamUrl,
} from './utils/livestream';
import {
  callService,
  ServiceCaller,
  createServiceCaller,
  serviceCallBuilder,
} from './graphql/interservice.communication';
import encodeForFirebaseKey from './utils/encodeForFirebaseKey';
import {
  ModelDeltaType,
  IModelDelta,
  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,
  mutateDelta,
  saveDelta,
  primaryModelOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,
} from './utils/delta';
import {
  IModelReorderPayload,
  IModelReorderNeighbors,
  IModelReorderBisection,
  reorderTypeDefs,
  deriveModelReorderNeighbors,
  bisectReorderModels,
} from './utils/reorder';
import { SortKeyProvider } from './utils/sortKey/provider';
import * as sortKeyBase64 from './utils/sortKey/base64';
import * as sortKeyPaddedNumeric from './utils/sortKey/paddedNumeric';

export {
  VERSION,

  Context,
  IContext,
  ContextConstructorArgs,
  createContext,
  logContextRequest,
  injectContextIntoRequestMiddleware,

  ApolloEnvironmentConfig,
  ApolloEnvironmentVariant,
  deriveApolloEnvironmentConfig,

  IApolloServerArgs,
  createApolloServer,

  IServer,
  Server,
  initApp,

  bodyParserGraphql,
  getDefaultMiddleware,

  sessionMiddleware,
  SESSION_COOKIE_NAME,
  SESSION_HEADER_NAME,
  SESSION_REQUEST_PROPERTY,

  ControllerTemplate,
  ModelTemplate,
  ModelTemplateClass,
  ModelViewTemplate,
  ViewTemplate,

  NO_USER,
  NO_TOKEN,
  deriveTokenHeaderValue,
  tokenCheck,

  TokenConfig,
  verifyAll,

  coreResolvers,
  coreTypeDefs,
  CoreTypeDate,
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
  createGraphQLEnumValues,

  EdgeWrapper,
  edgeWrapperType,

  LivestreamUrlParseResult,
  LivestreamUrlProvider,
  livestreamGraphQL,
  parseLivestreamUrl,

  callService,
  ServiceCaller,
  createServiceCaller,
  serviceCallBuilder,

  AuthenticationError,
  AuthorizationError,
  BadRequestError,
  GenericError,
  NotFoundError,

  ModelDeltaType,
  IModelDelta,
  buildSnapshotDelta,
  buildCreateDelta,
  isCreateDelta,
  buildDeleteDelta,
  isDeleteDelta,
  buildNoOpDelta,
  isNoOpDelta,
  mutateDelta,
  saveDelta,
  primaryModelOfDelta,
  deriveIsDirtyFlagsFromDelta,
  isDirtyDelta,

  IModelReorderPayload,
  IModelReorderNeighbors,
  IModelReorderBisection,
  reorderTypeDefs,
  deriveModelReorderNeighbors,
  bisectReorderModels,

  SortKeyProvider,
  sortKeyBase64,
  sortKeyPaddedNumeric,

  encodeForFirebaseKey
};
