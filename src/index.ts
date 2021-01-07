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

import { ControllerTemplate, ControllerTemplateWithContext } from './templates/controller.template';
import { ModelViewTemplate, ViewTemplate } from './templates/view.template';
import { ModelTemplate, ModelTemplateClass } from './templates/model.template';
import {
  coreResolvers,
  coreTypeDefs,
  CoreTypeDate,
  CoreTypeLocationInput,
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
  formatCoreTypeDateTimestamp,
  parseCoreTypeInputDateAndTimezone,
  parseCoreTypeInputTimezone,
} from './graphql/core.types'
import {
  FederatedTypeReference,
  federatedUserById,
  federatedEventById,
  federatedPhotoById,
  federatedVideoById,
} from './graphql/federated.types'
import { loadDotEnv } from './utils/dotenv';
import { createGraphQLEnumValues } from './utils/graphql.enum';
import { EdgeWrapper, edgeWrapperType } from './utils/edge.wrapper';
import { logTypeORMConfig } from './utils/typeorm';
import {
  VirtualEventLinkParseResult,
  VirtualEventProvider,
  virtualEventGraphQL,
  parseVirtualEventLink,
} from './utils/virtualEvent';
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
  shallowCloneDelta,
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
import {
  applyMixinClasses,
} from './utils/typescript';
import {
  shouldLocationBeFetched,
  reproducibleLocationId,
} from './utils/location';
import {
  Location
} from './data/location/model';
import {
  GooglePlacesConfig,
  GooglePlacesClient,
  googlePlacesClient,
} from './data/location/googlePlacesClient';
import {
  LocationView,
  DecoratedLocationView,
} from './data/location/view';


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
  ControllerTemplateWithContext,
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
  CoreTypeLocationInput,
  resolveCoreTypeDate,
  parseCoreTypeInputDate,
  formatCoreTypeDateTimestamp,
  parseCoreTypeInputDateAndTimezone,
  parseCoreTypeInputTimezone,
  FederatedTypeReference,
  federatedUserById,
  federatedEventById,
  federatedPhotoById,
  federatedVideoById,
  createGraphQLEnumValues,

  loadDotEnv,

  EdgeWrapper,
  edgeWrapperType,

  logTypeORMConfig,

  VirtualEventLinkParseResult,
  VirtualEventProvider,
  virtualEventGraphQL,
  parseVirtualEventLink,

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
  shallowCloneDelta,
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

  encodeForFirebaseKey,

  applyMixinClasses,

  shouldLocationBeFetched,
  reproducibleLocationId,
  GooglePlacesConfig,
  GooglePlacesClient,
  googlePlacesClient,

  Location,
  LocationView,
  DecoratedLocationView,

};
