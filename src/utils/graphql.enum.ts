import { GraphQLEnumValueConfigMap } from 'graphql';

export const createGraphQLEnumValues = <T>(arg: T): GraphQLEnumValueConfigMap => {
  return Object.keys(arg).reduce((acc: GraphQLEnumValueConfigMap, curr) => {
    return { ...acc, [curr]: { value: curr } };
  }, {});
};
