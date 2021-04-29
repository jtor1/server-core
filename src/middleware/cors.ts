import { isString } from 'lodash';
import cors from 'cors';


export const corsMiddleware = cors({
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

  // how long the results of a preflight request ... can be cached.
  // to address
  //   @kevin: the fetch API periodically reports  “TypeError: Failed to fetch”
  //   @madhur: [unless we] return that header.
  //     so all browsers will reissue the options request every 5 seconds.
  //     which increases the chances of this failure occurring
  maxAge: 86400,
});
