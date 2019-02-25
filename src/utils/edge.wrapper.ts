import {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLList,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectTypeConfig
} from 'graphql';
import { Context, IContext } from '../server/apollo.context';

import { EntityModelTemplate } from '../templates/model.template';

const pageInfoType = new GraphQLObjectType({
  name: 'PageInfo',
  fields: () => ({
    hasNextPage: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    hasPreviousPage: {
      type: new GraphQLNonNull(GraphQLBoolean)
    },
    startCursor: {
      type: GraphQLString
    },
    endCursor: {
      type: GraphQLString
    }
  })
});

export const edgeWrapperType = <T extends GraphQLObjectType, C extends IContext>(parentName: string, node: T) => {
  const nodeType = <T extends GraphQLObjectType>(itemType: T) => new GraphQLObjectType({
    name: `${parentName}${node.name}sEdge`,
    fields: () => ({
      node: {
        type: new GraphQLNonNull(itemType)
      },
      cursor: {
        type: new GraphQLNonNull(GraphQLString)
      }
    })
  });
  const edgeWrapperConfig: GraphQLObjectTypeConfig<EdgeWrapper<C, any>, C> = {
    name: `${parentName}${node.name}sConnection`,
    fields: () => ({
      edges: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(nodeType(node)))),
        resolve: async (source) => {
          const data = await source.data();
          return data.edges;
        }
      },
      pageInfo: {
        type: new GraphQLNonNull(pageInfoType),
        resolve: async (source) => {
          const data = await source.data();
          return data.pageInfo;
        }
      }
    })
  };
  return new GraphQLObjectType(edgeWrapperConfig);
};

interface DecodedCursor {
  id: string;
  key: number;
  count: number;
}

interface EdgeWrapperInput {
  perPage?: number;
  page?: number;
  cursor?: string;
}

export class EdgeWrapper<C extends IContext, T extends EntityModelTemplate<any, C> & { index: number }> {
  private context: C;
  private ids: Array<string>;
  private requestItems: (context: C, ids: Array<string>) => Promise<Array<T>>;
  private perPage: number;
  private offset?: number;
  private lastItemKey?: number;

  constructor(context: C, ids: Array<string>, args: EdgeWrapperInput, func: (context: C, ids: Array<string>) => Promise<Array<T>>) {
    this.context = context;
    this.ids = ids;
    this.requestItems = func;
    if (args.perPage) {
      this.perPage = args.perPage;
      if (args.page) {
        this.offset = (args.page * this.perPage) - this.perPage;
      }
    } else if (args.cursor) {
      const decodedCursor = this.decodeCursor(args.cursor);
      this.perPage = decodedCursor.count;
      this.lastItemKey = decodedCursor.key;
    }
  }

  public data = async () => {
    const nodes = await this.requestItems(this.context, this.ids);
    const filteredNodes = this.filterKeys(nodes, this.lastItemKey, this.perPage, this.offset);
    return {
      pageInfo: {
        hasNextPage: (nodes.length > 0 && filteredNodes.length > 0) ? (nodes[nodes.length - 1].id !== filteredNodes[filteredNodes.length - 1].id) : false,
        hasPreviousPage: (nodes.length > 0 && filteredNodes.length > 0) ? (nodes[0].id !== filteredNodes[0].id) : false,
        startCursor: filteredNodes.length > 0 ? this.generateCursor(this.perPage, filteredNodes[0].id, filteredNodes[0].key) : null,
        endCursor: filteredNodes.length > 0 ? this.generateCursor(this.perPage, filteredNodes[filteredNodes.length - 1].id, filteredNodes[filteredNodes.length - 1].key) : null
      },
      edges: filteredNodes.map(node => {
        return {
          node,
          cursor: this.generateCursor(this.perPage, node.id, node.key)
         };
      })
    };
  }

  private filterKeys = (nodes: Array<T>, lastItemKey?: number, perPage?: number, offset?: number) => {
    if (lastItemKey && perPage) {
      const cursorObject = this.getCursorObject(nodes, lastItemKey);
      return this.paginateList(nodes, cursorObject.index + 1, (cursorObject.index + perPage + 1)).sort((a, b) => a.index - b.index);
    } else if (perPage && offset) {
      return this.paginateList(nodes, offset, (offset + perPage)).sort((a, b) => a.index - b.index);
    } else if (perPage) {
      return nodes.filter((_, index) => index < perPage).sort((a, b) => a.index - b.index);
    } else {
      return nodes.sort((a, b) => a.index - b.index);
    }
  }

  private generateCursor = (count: number, id: string, key: number) => {
    try {
      return Buffer.from(JSON.stringify({ id, count, key })).toString('base64');
    } catch (err) {
      throw Error(err);
    }
  }

  private decodeCursor = (cursor: string): DecodedCursor => {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch (err) {
      throw Error(err);
    }
  }

  private paginateList = (list: Array<T>, start: number, end: number): Array<T> => {
    return list.reduce((acc: Array<T>, curr, index) => {
      if (index + 1 > start && index + 1 <= end) {
        return [...acc, curr];
      } else {
        return acc;
      }
    }, []);
  }

  private getCursorObject = (list: Array<T>, key: number) => {
    return list.reduce((acc, curr) => curr.key === key ? curr : acc);
  }
}
