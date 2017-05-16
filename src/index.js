// @flow

import 'babel-polyfill';

import path from 'path';
import rollbar from 'rollbar';
import Koa from 'koa';
import helmet from 'koa-helmet';


import Pug from 'koa-pug';
import Router from 'koa-router';
import koaLogger from 'koa-logger';
import serve from 'koa-static';
import middleware from 'koa-webpack';
import bodyParser from 'koa-bodyparser';
import session from 'koa-generic-session';
import flash from 'koa-flash-simple';
import _ from 'lodash';
import methodOverride from 'koa-methodoverride';
import getWebpackConfig from '../webpack.config.babel';
import log from './lib/logger';
import addRoutes from './controllers';
import container from './container';


export default () => {
  rollbar.init('cdf739f901b84a7f880d778e1207638c');

  const app = new Koa();

  app.use(helmet());
  app.keys = ['some secret hurr'];
  app.use(session(app));
  app.use(flash());

  app.use(async (ctx, next) => {
    ctx.state = {
      flash: ctx.flash,
      isSignedIn: () => ctx.session.userId !== undefined,
    };
    await next();
  });
  app.use(bodyParser());
  /* eslint-disable */
  app.use(methodOverride((req) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      return req.body._method;
    }
  }));
  /* eslint-enable */
  app.use(serve(path.join(__dirname, '..', 'public')));

  if (process.env.NODE_ENV !== 'test') {
    app.use(middleware({
      config: getWebpackConfig(),
    }));
  }

  app.use(koaLogger());
  const router = new Router();
  addRoutes(router, container);
  app.use(router.allowedMethods());
  app.use(router.routes());

  const pug = new Pug({
    viewPath: path.join(__dirname, 'views'),
    debug: true,
    pretty: true,
    compileDebug: true,
    locals: [],
    basedir: path.join(__dirname, 'views'),
    helperPath: [
      { _ },
      { urlFor: (...args) => router.url(...args) },
    ],
  });
  pug.use(app);
  log('First launch successful');

  const options = {
    exitOnUncaughtException: true,
  };
  rollbar.errorHandler('cdf739f901b84a7f880d778e1207638c');
  rollbar.handleUncaughtExceptionsAndRejections('cdf739f901b84a7f880d778e1207638c', options);

  return app;
};
