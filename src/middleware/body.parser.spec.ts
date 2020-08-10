import { ifError } from 'assert';
import { noop } from 'lodash';
import { RequestHandler } from 'express'
import { createRequest, createResponse } from 'node-mocks-http';

import {
  bodyParserGraphql,
} from './body.parser';


describe('middleware/body.parser', () => {
  describe('bodyParserGraphql', () => {
    const QUERY = 'ANY OLD THING';
    let parser: RequestHandler;

    it('parses the proper MIME type', () => {
      const req = createRequest({
        headers: {
          'content-type': 'application/graphql',
          'content-length': String(QUERY.length), // boilerplate
        },
        body: <any>QUERY,
        resume: noop, // boilerplate
      });

      parser = bodyParserGraphql();
      parser(
        req,
        createResponse(),
        (err: any) => {
          ifError(err);

          expect(req.body).toEqual({
            query: QUERY,
          });
        }
      );
    });

    it('ignores other MIME types', () => {
      const req = createRequest({
        headers: {
          'content-type': 'text/plain',
          'content-length': String(QUERY.length),
        },
        body: <any>QUERY,
        resume: noop,
      });

      parser = bodyParserGraphql();
      parser(
        req,
        createResponse(),
        (err: any) => {
          ifError(err);

          expect(req.body).toEqual(QUERY); // unchanged
        }
      );
    });

    it('leverages an underlying Text parser', () => {
      const req = createRequest({
        headers: {
          'content-type': 'application/graphql',
          'content-length': String(QUERY.length),
        },
        body: <any>QUERY,
        resume: noop,
      });

      parser = bodyParserGraphql({
        limit: '2b', // yes, 2 bytes
      });
      parser(
        req,
        createResponse(),
        (err: any) => {
          // HTTP 413 Entity Too Large
          expect(err.status).toBe(413);

          expect(req.body).toEqual(QUERY); // unchanged
        }
      );
    });
  });
});
