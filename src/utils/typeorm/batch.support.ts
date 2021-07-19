/* istanbul ignore file */
//   it('is covered in @withjoy/server-core-test, with a backing database', noop);

import {
  compact,
  groupBy,
  isFunction,
  isString,
} from 'lodash';
import {
  getRepository,
  EntityMetadata,
  EntityManager,
  ObjectLiteral,
  SelectQueryBuilder,
  QueryBuilder,
} from 'typeorm';
// we also need some of their internal tools
import { Subject } from 'typeorm/persistence/Subject';
import { ManyToManySubjectBuilder } from 'typeorm/persistence/subject-builder/ManyToManySubjectBuilder';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';

export interface ObjectLiteralClass<ObjectLiteral> {
  new(...args: any[]): ObjectLiteral;
};


interface IEntityDefaultValueApplier<T extends ObjectLiteral> {
  (object: Record<string, any>): Record<string, any>;
}

function _defaultEntityValueApplier<T extends ObjectLiteral>(
  Model: ObjectLiteralClass<T>
): IEntityDefaultValueApplier<T> {
  return function applyDefaultEntityValues<U extends Record<string, any>>(object: U): U {
    const repository = getRepository(Model); // does not need to come from an EntityManager
    const { ownColumns } = repository.metadata;

    ownColumns.forEach((ownColumn) => {
      const { default: defaultValue, propertyName } = ownColumn;
      if (object[propertyName] !== undefined) {
        return;
      }

      // mutate in-place
      //   just like TypeORM would do with the `key` after an INSERT
      if (defaultValue === undefined) {
        Reflect.set(object, propertyName, null);
      }
      else if (isFunction(defaultValue)) {
        Reflect.set(object, propertyName, defaultValue());
      }
      else {
        Reflect.set(object, propertyName, defaultValue);
      }
    });

    return object;
  }
}

/**
 * Caveats:
 * - the default value is only applied if the property's value is `undefined`
 * - properties which are `undefined` *and* do not have a default `@Column` value are set to `null`
 *
 * @param models {ObjectLiteral[]}
 * @returns {ObjectLiteral[]} the Models provided,
 *   with its properties populated with the default value from its `@Column` decorator
 */
export function applyDefaultEntityValues<T extends ObjectLiteral>(
  models: T[]
): T[] {
  models.forEach((model) => {
    const Model = (model.constructor as ObjectLiteralClass<T>);
    const applier = _defaultEntityValueApplier(Model);
    applier(model);
  });
  return models;
}


export function queryBuilderToInsertModels<T extends ObjectLiteral>(
  entityManager: EntityManager,
  models: Array<T>
): QueryBuilder<T> | null {
  if (models.length === 0) {
    return null;
  }

  // you can't insert disparate Models this way
  const Model = (models[0].constructor as ObjectLiteralClass<T>);
  const sameModels = models.every((model) => model.constructor === Model);
  if (! sameModels) {
    throw new Error('queryBuilderToInsertModels:  all Models must be of the same Class');
  }

  return entityManager.createQueryBuilder(Model, 'model')
  .insert()
  .values(models as any /* QueryDeepPartialEntity<T> */);
}

export function queryBuildersToForceKeysOfModels<T extends ObjectLiteral>(
  entityManager: EntityManager,
  models: T[]
): Array<QueryBuilder<T>> {
  // these Models, which have just been INSERTed, may be aware of their own `key`s
  //   but Postgres has gone and generate its own `key` on every row via Sequence.
  //   that won't do -- the Models are inter-related by their in-memory `key`s
  //   so -- we've got to UPDATE that column.
  // the sad thing is, an entire batch of Sequence values got allocated / consumed
  //   only to be throw away :(
  const queryBuilders = models.map((model): QueryBuilder<T> | null => {
    const Model = (model.constructor as ObjectLiteralClass<T>);
    const key = Reflect.get(model, 'key');
    if (key === undefined) {
      return null;
    }

    return entityManager.createQueryBuilder(Model, 'model')
    .update()
    .set({ key } as any /* QueryDeepPartialEntity<T> */)
    .where('id = :id', { id: model.id });
  });

  return compact(queryBuilders);
}

export async function injectSequenceKeysIntoModels<T extends ObjectLiteral>(
  entityManager: EntityManager,
  models: T[]
): Promise<T[]> {
  const expressions = models.map((model, index: number) => {
    const { metadata } = entityManager.getRepository(model.constructor);
    const sequenceName = `${ metadata.tableName }_key_seq`; // per convention
    const sequenceAlias = `seq_${ index }`;
    return `nextval('${ sequenceName }') as ${ sequenceAlias }`
  });

  const query = `SELECT ${ expressions.join(', ') }`;
  const results = await entityManager.query(query);
  const keys: Record<string, string> = results[0]; // from the 0th "raw" SELECT

  // mutate in-place
  //   just like TypeORM would do with the `key` after an INSERT
  models.forEach((model, index: number) => {
    const sequenceAlias = `seq_${ index }`;
    const numericKey = parseInt(keys[sequenceAlias], 10);
    Reflect.set(model, 'key', numericKey);
  });

  return models;
}


export function queryBuilderToDeleteModelById<T extends ObjectLiteral>(
  entityManager: EntityManager,
  model: T,
): QueryBuilder<T> {
  const Model = (model.constructor as ObjectLiteralClass<T>);
  return entityManager.createQueryBuilder(Model, 'model')
  .delete()
  .where('id = :id', { id: model.id });
}

/**
 * @param entityManager {EntityManager}
 * @param Model {typeof ObjectLiteral} the Model class whose rows will be deleted
 * @param selectQueryBuilder {SelectQueryBuilder} a QueryBuilder
 *   which will 'SELECT id FROM ...' Model,
 *   including any parameters necessary to execute the Query
 * @returns {QueryBuilder} a QueryBuilder which performs the DELETE
 */
export function queryBuilderToDeleteModelsBySelectedIds<T extends ObjectLiteral>(
  entityManager: EntityManager,
  Model: ObjectLiteralClass<T>,
  selectQueryBuilder: SelectQueryBuilder<T>
): QueryBuilder<T> {
  // yep, this is how you do it in `typeorm`
  //   syntax = `DELETE FROM "foo" WHERE "id" IN (SELECT ...)`, because no JOINs in a DELETE
  const deleteQuery = entityManager.createQueryBuilder(Model, 'model')
  .delete()
  .where(`id IN (${ selectQueryBuilder.getQuery() })`)
  .setParameters(selectQueryBuilder.getParameters());

  return deleteQuery;
}

export interface IQueryBuilderToDeleteModelsByParentIdIOptions<T extends ObjectLiteral> {
  // yeah, this can get complicated ...
  //   Model property names, in child => parent order, to reach your top-level parent ("ancestor");
  //   eg. [ 'mom', 'grandma' ] => 'great-grandma'
  //   or omitted, if you just care about => 'dad'
  ancestorRelations?: string[];
  //   the Model property name, and Model content, of your top-level parent
  ancestorName: string;
  ancestorModels: T[];
};
export function queryBuilderToDeleteModelsByParentId<T extends ObjectLiteral, U extends ObjectLiteral>(
  entityManager: EntityManager,
  Model: ObjectLiteralClass<T>,
  options: IQueryBuilderToDeleteModelsByParentIdIOptions<U>
): QueryBuilder<T> | null {
  const { ancestorName, ancestorModels, ancestorRelations } = options;
  const ancestorIds = (<unknown>ancestorModels as ObjectLiteral[]).map((model) => model.id);
  if (ancestorIds.length === 0) {
    // there are no parents?
    //   then there is no parent-child relationship to abandon!
    //   also, because `NOT IN ()` is unparseable SQL
    return null;
  }

  // our baseline SELECT;
  //   'model' is the alias of the Model(s) to be deleted
  let childAlias = 'model';
  let selectQuery = entityManager.createQueryBuilder(Model, childAlias)
  .select('model.id'); // original `childAlias` for the Model

  (ancestorRelations || []).forEach((ancestorRelation, index) => {
    const parentAlias = `parent_${ index }`;
    selectQuery = selectQuery.leftJoin(`${ childAlias }.${ ancestorRelation }`, parentAlias);
    childAlias = parentAlias;
  });

  selectQuery = selectQuery
  .leftJoin(`${ childAlias }.${ ancestorName }`, 'ancestor')
  .where('ancestor.id IN (:...ancestorIds)')
  .setParameters({ ancestorIds });

  return queryBuilderToDeleteModelsBySelectedIds(entityManager, Model, selectQuery);
}


export interface IQueryBuildersToInsertManyToManyJunctionOptions<T extends ObjectLiteral> {
  // you must specify the child relationships you care about.
  //   in practice we have Schedule <=> Label <=> Person <=> Schedule
  //   and if we aren't specific about the relations,
  //   we will get duplicate inserts
  childRelations: string[],
};
export function queryBuildersToInsertManyToManyJunctions<T extends ObjectLiteral, U extends ObjectLiteral>(
  entityManager: EntityManager,
  models: Array<T>,
  options: IQueryBuildersToInsertManyToManyJunctionOptions<U>
  // we aren't sure what type of Model it'll insert;
  //   it's an internal internal 'T + U' Junction Model representation
): QueryBuilder<ObjectLiteral>[] {
  // the intent is to emultate @ManyToMany's cascade-on-INSERT behavior for Junction tables

  // TODO:  is there any way to operate in specified order?
  //   is there any need to?
  //   deletion sure needed it ...
  const { childRelations } = options;
  const childRelationSet = new Set<string>(childRelations);

  // for each type of Model, identify the Junctions (eg. table names) that we should insert
  const metadataToJunctionSet = new Map<EntityMetadata, Set<string>>();
  models.forEach((model) => {
    const metadata = getRepository(model.constructor).metadata;
    if (metadataToJunctionSet.has(metadata)) {
      return;
    }

    const relations = metadata.manyToManyRelations;

    const junctionSet = new Set<string>(
      relations
      .filter((relation) => (
        // it's a valid Junction relationship that we care about
        childRelationSet.has(relation.propertyName) &&
        isString(relation.junctionEntityMetadata?.target)
      ))
      .map((relation) => relation.junctionEntityMetadata!.target as string) // name of the table
    );

    metadataToJunctionSet.set(metadata, junctionSet);
  });

  // aggregate all relevant @ManyToMany Entities to insert per Model
  const manyToManySubjects = models.reduce((reduced: Subject[], model) => {
    const metadata = getRepository(model.constructor).metadata;
    const junctionSet = metadataToJunctionSet.get(metadata)!;

    // extracted from EntityPersistExecutor#execute
    const allSubjects = [ new Subject({
      metadata,
      entity: model,
      canBeInserted: true,
      canBeUpdated: true,
      mustBeRemoved: false,
    }) ];

    // this will append @ManyToMany Subjects to the Array provided (eg. mutate in-place)
    new ManyToManySubjectBuilder(allSubjects).build();

    const relevantSubjects = allSubjects.filter((subject, index) => {
      if (index === 0) {
        // that's the *Model's* Subject, seeded into in the constructed Array;
        //   it's not our reponsibility
        return false;
      }

      // insert it, if it's a relationship / Junction table that we care about
      const junction = subject.metadata.target as string;
      return junctionSet.has(junction);
    });

    return reduced.concat(relevantSubjects);
  }, []);

  // batch-insert by Junction table
  const manyToManyByJunction = groupBy(manyToManySubjects, (subject) => subject.metadata.target);

  const queryBuilders = Object.keys(manyToManyByJunction).map((target: string): QueryBuilder<any> => {
    const subjects = manyToManyByJunction[target];

    // extracted from SubjectExecutor#executeInsertOperations
    const values = subjects.map((subject) => subject.createValueSetAndPopChangeMap());
    return entityManager.createQueryBuilder().insert().into(target).values(values);
  });
  return queryBuilders;
}


export interface IQueryBuildersToDeleteManyToManyJunctionsByParentIdOptions<T extends ObjectLiteral>
  extends IQueryBuilderToDeleteModelsByParentIdIOptions<T>
{
  // you must specify the child relationships you care about.
  //   not *critical*; duplicate deletes are not an issue (unlike duplicate inserts)
  //   but it's sensible to follow the same pattern as `queryBuildersToInsertManyToManyJunctions`
  childRelations: string[],
};
export function queryBuildersToDeleteManyToManyJunctionsByParentId<T extends ObjectLiteral, U extends ObjectLiteral>(
  entityManager: EntityManager,
  Model: ObjectLiteralClass<T>,
  options: IQueryBuildersToDeleteManyToManyJunctionsByParentIdOptions<U>
): QueryBuilder<ObjectLiteral>[] {
  // the intent is to emultate @ManyToMany's cascade-on-DELETE behavior for Junction tables

  const { ancestorName, ancestorModels, ancestorRelations, childRelations } = options;
  const ancestorIds = (<unknown>ancestorModels as ObjectLiteral[]).map((model) => model.id);
  if (ancestorIds.length === 0) {
    // there are no parents?
    //   @see queryBuilderToDeleteModelsByParentId
    return [];
  }

  // yep, this is how you do it in `typeorm`
  //   @see queryBuilderToDeleteModelsByParentId
  let childAlias = 'model';
  let selectQuery = entityManager.createQueryBuilder(Model, childAlias);

  (ancestorRelations || []).forEach((ancestorRelation, index) => {
    const parentAlias = `parent_${index}`;
    selectQuery = selectQuery.leftJoin(`${childAlias}.${ancestorRelation}`, parentAlias);
    childAlias = parentAlias;
  });

  const { metadata } = getRepository(Model);
  const relations = metadata.manyToManyRelations;
  const relationMap = new Map<string, RelationMetadata>(
    relations.map((relation) => [ relation.propertyName, relation ])
  );

  // in specified order!
  //   in case your ancestry happens to be related by a @ManyToMany relation,
  //   in which case ... delete that relationship *last*
  const queryBuilders: QueryBuilder<ObjectLiteral>[] = childRelations.reduce((reduced: QueryBuilder<ObjectLiteral>[], propertyName): QueryBuilder<ObjectLiteral>[] => {
    if (! relationMap.has(propertyName)) {
      return reduced;
    }

    const relation = relationMap.get(propertyName);
    const junction = relation?.junctionEntityMetadata;
    if (! junction) {
      return reduced;
    }
    const column = junction.columns.find((column) => (column.referencedColumn!.entityMetadata.target === Model));
    if (! column) {
      return reduced;
    }

    const modelPropertyName = column.referencedColumn!.propertyName;
    const junctionPropertyName = column.propertyName;
    const relationSelectQuery = selectQuery.clone()
    .leftJoin(`${childAlias}.${ancestorName}`, 'ancestor')
    .select(`model."${modelPropertyName}"`) // original `childAlias` for the Model
    .where('ancestor.id IN (:...ancestorIds)');

    const deleteQuery = entityManager.createQueryBuilder()
    .delete()
    .from(junction.target)
    .where(`"${junctionPropertyName}" IN (${relationSelectQuery.getQuery()})`)
    .setParameters({ ancestorIds });

    return reduced.concat(<unknown>deleteQuery as QueryBuilder<ObjectLiteral>);
  }, []);

  return queryBuilders;
}
