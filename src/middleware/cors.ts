import { RequestHandler } from 'express';
import { isString } from 'lodash';
import cors from 'cors';


const MAX_AGE = 86400; // 1 day

const CORS = cors({
  origin: function(originProvided, callback) {
    // // FIXME:  the right thing to do
    // //   however ... all Dev would need to be done from '*.withjoy.com' via /etc/hosts
    // //   let's not bite that off just yet
    // try {
    //   const { hostname } = urlParse(originProvided);
    //   const matches = (hostname && WITHJOY_DOMAIN_REGEX.test(hostname)) || false;
    //   callback(null, matches);
    // }
    // catch (err) {
    //   callback(null, false);
    // }

    // https://github.com/expressjs/cors#configuration-options
    //   a String is an acceptable callback value, TypeScript be damned
    const originAllowed: any = (isString(originProvided) ? originProvided : '') || '*';
    callback(null, originAllowed);
  },

  // required for Cookie support
  credentials: true,

  // // "how long the results of a preflight request ... can be cached."
  // // to address CORE-1399 emit 'Access-Control-Max-Age: 86400' for CORS OPTIONS
  // //   @kevin: the fetch API periodically reports  “TypeError: Failed to fetch”
  // //   @madhur: [we should] return [the 'Access-Control-Max-Age'] header.
  // //     so all browsers will reissue the optiodsns request every 5 seconds.
  // //     which increases the chances of this failure occurring
  // maxAge: MAX_AGE,

  // always the same, to avoid a bad caching situation
  methods: [ 'GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE' ],
});


export const corsMiddleware: RequestHandler = function corsMiddleware(req, res, next) {
  // if (req.method === 'OPTIONS') {
  //   // to match 'Access-Control-Max-Age'
  //   //   to address CORE-1399 emit 'Access-Control-Max-Age: 86400' for CORS OPTIONS
  //   // @madhur: so that nginx (and cloud front in the future) can cache this response
  //   //   and return it even more quickly to the browser.
  //   res.setHeader('cache-control', `s-maxage=${ MAX_AGE }`);
  // }

  // `cors` is also the rendering terminus for 'OPTIONS' requests
  CORS(req, res, next);
};
