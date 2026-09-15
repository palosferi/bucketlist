const path = require('path');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const db = require('./config/db');
const config = require('./lib/config');
const photoStore = require('./lib/photoStore');
const subscribeToRoutes = require('./routing/routing.js');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// Behind nginx-proxy-manager and Cloudflare, so the first proxy hop carries
// the real client IP and protocol. Without this, secure cookies and the rate
// limiter both misbehave.
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// The vendored world geometry is ~740 KB of JSON and compresses to under a
// third of that, which matters a lot when serving from a home connection.
app.use(compression());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    // d3, topojson and the world geometry are all served from this origin, so
    // the CSP above needs no third-party allowances at all.
    referrerPolicy: { policy: 'no-referrer' },
  })
);

app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

// Express 5 leaves req.body undefined when there was nothing to parse (every
// GET, and any POST without a recognised content type). Normalising it here
// means no handler has to guard before reading a field.
app.use((req, res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

// One MongoClient shared by Mongoose and the session store. Passing a URL to
// connect-mongo instead would open a second, independent connection that fails
// as an unhandled rejection whenever the database is not up yet.
const mongoClientPromise = db.connectToDatabase().then((m) => m.connection.getClient());
// start() awaits the same promise and reports the failure properly; this only
// stops Node from treating an early rejection as fatal before we get there.
mongoClientPromise.catch(() => {});

// Registered before the session middleware so the container healthcheck —
// which runs every 30 seconds forever — never touches the session store.
app.get(config.path('/healthz'), (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const SESSION_SECRET = config.sessionSecret;
if (isProd && (!SESSION_SECRET || SESSION_SECRET.length < 32)) {
  console.error('[boot] SESSION_SECRET must be set to at least 32 characters in production.');
  process.exit(1);
}
if (isProd && !process.env.PUBLIC_BASE_URL) {
  console.error('[boot] PUBLIC_BASE_URL must be set in production — email links depend on it.');
  process.exit(1);
}

app.use(
  session({
    name: 'bl.sid',
    secret: SESSION_SECRET || 'dev-only-insecure-secret-change-me',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({ clientPromise: mongoClientPromise, ttl: 60 * 60 * 24 * 14 }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 14,
      // Scoped to the mount point so the session cookie is not sent to
      // everything else sharing this origin (the portfolio at /).
      path: config.basePath || '/',
    },
  })
);

// Rate limits, tightest where the cost of abuse is highest. Signup is capped
// hardest because each one can trigger an outbound email and create storage.
const limiter = (windowMs, limit, opts = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: 'Too many attempts. Try again in a few minutes.',
    ...opts,
  });

const at = (p) => config.path(p);
app.use(at('/signup'), limiter(60 * 60 * 1000, 5));
app.use(at('/login'), limiter(15 * 60 * 1000, 20, { skipSuccessfulRequests: true }));
app.use(at('/forgot'), limiter(60 * 60 * 1000, 5));
app.use(at('/reset'), limiter(60 * 60 * 1000, 10));
app.use(at('/verify/resend'), limiter(60 * 60 * 1000, 5));
// A broad backstop so no single address can hammer the whole app.
app.use(limiter(15 * 60 * 1000, 600, { skip: (req) => req.path === at('/healthz') }));

// Everything the app serves lives under config.basePath. Mounting a router
// rather than using app.use(path, ...) per route keeps the route table free of
// the prefix, so the app is identical whether it owns the origin or a subpath.
const router = express.Router();

router.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: isProd ? '7d' : 0,
  })
);

// Outgoing URLs need the prefix even though incoming routes do not: wrapping
// redirect here means no middleware has to remember to add it.
app.use((req, res, next) => {
  const redirect = res.redirect.bind(res);
  res.redirect = (target) =>
    redirect(typeof target === 'string' && target.startsWith('/') ? config.path(target) : target);
  next();
});

subscribeToRoutes(router);
app.use(config.basePath || '/', router);

const port = process.env.PORT || 3000;

async function start() {
  try {
    await mongoClientPromise;
    console.log('[boot] connected to MongoDB');
    await photoStore.init();
    console.log(`[boot] photo store at ${photoStore.UPLOAD_DIR}`);
  } catch (err) {
    console.error('[boot] startup failed:', err.message);
    process.exit(1);
  }

  const server = app.listen(port, () => {
    console.log(`[boot] listening on http://localhost:${port}${config.basePath}`);
    console.log(`[boot] public base URL ${config.url('/')}`);
    console.log(`[boot] signups ${config.signupsOpen ? 'OPEN' : 'closed'}`);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      console.log(`[shutdown] ${signal} received`);
      server.close(() => db.connection.close(false).then(() => process.exit(0)));
    });
  }
}

if (require.main === module) start();

module.exports = app;
