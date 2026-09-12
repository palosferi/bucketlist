# Bucketlist

A server-rendered web app for keeping a bucketlist: the things you want to do,
the ones you have already done, and where in the world they happened. Lists are
private by default; you can share one by link or publish it to an interactive
world map on your public profile.

Live map example: `/u/your-handle`.

## How privacy works

This is the central design decision, so it is worth stating plainly.

Location is split into a public half and a private half:

| Field | Visibility | Notes |
| --- | --- | --- |
| `country` | **public** when the list is | ISO 3166-1 alpha-2, chosen from a fixed list |
| `placeName` | private, always | free text, only the owner sees it |
| `latitude` / `longitude` | private, always | full decimal precision |
| photos | follow the adventure's visibility | re-encoded on upload, EXIF/GPS stripped |

### Unfinished adventures are private by default

A bucketlist is mostly things you have *not* done yet, and a dated plan on a
public page announces when you will be away from home. So an adventure only
appears publicly once it is marked done — or when its owner ticks "show on my
public map before it is done" for that specific entry.

This is enforced in the database query (`$or: [{done: true}, {shareUndone:
true}]`) rather than in a template, and the photo route applies the same rule,
so an unfinished adventure's photos stay private even on a public list.

### Why country is the public half

A country is too coarse to identify anyone, so it is safe to colour a map with.
The exact spot never leaves the owner's own pages — `Adventure.toPublicJSON()`
is the only way an adventure reaches a public template, and it does not carry
the private fields. There is a test asserting exactly that.

Earlier versions kept a single shared `Location` collection. It was removed
because it leaked: a private adventure at a sensitive place still created a
globally visible row holding that place's coordinates, and any user could
delete a location that another user's adventure depended on.

## Accounts

Signup needs an email address, a handle and a password (bcrypt, cost 12).
Sessions live in MongoDB and are regenerated on login to prevent fixation.

**Email confirmation gates publishing, not use.** You can keep private lists
with an unconfirmed address; setting a list to public or unlisted requires a
confirmed one, so the service cannot be used to host content under an address
its owner does not control.

**Password reset** issues a one-hour, single-use token. Only a SHA-256 hash of
each token is stored, so a database dump cannot be used to seize accounts. A
reset — or a password change — bumps `user.sessionsValidFrom`, and any session
minted before that moment is refused on its next request. That logs out every
other device without depending on the session store being enumerable.

`/forgot` answers identically whether or not the address is registered, and
login compares against a dummy hash when no user is found, so neither endpoint
can be used to discover which addresses have accounts.

### Your data

[Settings](/settings) has both GDPR obligations as self-service buttons:

- **Export** — everything held about the account, as a JSON file.
- **Delete** — removes the account, lists, adventures, tokens and photo files
  immediately and irreversibly. Requires the password plus typing the handle.

## Architecture: middleware factories

Every piece of request handling is an Express middleware produced by a factory
function. A module under `middlewares/` does not export a middleware directly —
it exports a function that takes an object repository (`objRepo`) and returns
the actual `(req, res, next)` middleware:

```js
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return async (req, res, next) => { /* ... */ };
};
```

`objRepo` is assembled once in [routing/routing.js](routing/routing.js) and
holds the Mongoose models plus the photo store. Because dependencies are
injected rather than required inside the middleware, tests pass a fake
repository with `jest.fn()` stubs and exercise the middleware without a
database.

Routes are composed from these factories as small chains, each step writing its
result onto `res.locals` for the next one:

```js
app.get('/lists/:listId', requireAuth, loadListMW(objRepo), renderMW(objRepo, 'list'));
```

The `save*` middlewares are no-ops on `GET` — if the request is not a POST they
call `next()`, so the same chain serves both the form and its submission.
`renderMW(objRepo, view)` is the terminal step.

### Authorisation

Ownership is part of the database query, never a check performed afterwards:

```js
const list = await ListModel.findOne({ _id: req.params.listId, _owner: res.locals.currentUser._id });
```

Another user's id therefore finds nothing and renders a 404. There is no code
path that fetches a record first and authorises it second.

```
index.js              app setup, sessions, security headers, boot
routing/routing.js    objRepo + route composition + error handling
middlewares/          middleware factories
  auth/               signup, login, logout, session loading
  lists/              list CRUD
  adventures/         adventure CRUD
  photos/             upload, delete, access-controlled serving
  public/             public profile and shared-list loading
  csrf.js             synchroniser-token CSRF
lib/
  validate.js         input parsing and validation
  countries.js        generated ISO country data (see scripts/)
  photoStore.js       re-encoding, EXIF stripping, quota accounting
models/               Mongoose models (User, List, Adventure)
views/                ejs templates
public/               static assets, map.js, vendored d3/topojson
tests/                Jest tests
```

## Stack

- Node.js 22 + Express 5
- MongoDB with Mongoose 8, sessions in `connect-mongo`
- ejs templates, no client framework
- sharp for image re-encoding
- d3 + topojson for the map (vendored into `public/vendor/`, no CDN)
- Jest for tests

## Prerequisites

- Node.js >= 18
- A MongoDB instance. A container is easiest:

  ```sh
  docker run -d --name mongo -p 27017:27017 mongo:7
  ```

## Install and run

```sh
git clone https://github.com/palosferi/bucketlist.git
cd bucketlist
npm install
cp .env.example .env   # then fill in SESSION_SECRET
npm run dev            # nodemon, http://localhost:3000
```

`npm start` runs it without nodemon, as the container does.

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `SESSION_SECRET` | — | Signs session cookies. **Required in production**; the app refuses to boot without at least 32 characters. |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/bucketlist` | MongoDB connection string |
| `PORT` | `3000` | HTTP port |
| `UPLOAD_DIR` | `./data/photos` | Where re-encoded photos are written |
| `USER_QUOTA_BYTES` | `262144000` (250 MB) | Per-user photo storage cap |
| `PUBLIC_BASE_URL` | `http://localhost:3000` | Absolute public URL. Email links are built from it. **Required in production.** |
| `RESEND_API_KEY` | — | Resend API key. Without it, mail is logged to stdout instead of sent. |
| `MAIL_FROM` | Resend test sender | Must be an address at a domain verified in Resend |
| `BRAND_NAME` | `Adventures` | Name shown in the UI and emails |
| `CONTACT_EMAIL` | — | Shown on the privacy page; falls back to the issue tracker |
| `NODE_ENV` | — | `production` enables secure cookies and asset caching |

The default connection string uses `127.0.0.1` rather than `localhost` on
purpose: `localhost` can resolve to `::1` first, and some MongoDB setups only
accept connections over IPv4.

## Photo storage

Originals are never kept. Every upload is re-encoded to WebP, capped at 2048px
on the long edge, which turns arbitrary user uploads into a predictable
150-400 KB per photo and strips EXIF as a side effect. Limits are layered:

1. re-encoding (the real control on disk use),
2. 12 photos per adventure,
3. a per-user byte quota as a backstop.

## Operations

`GET /healthz` returns `{ok:true}` without touching the database — point uptime
monitoring at it.

`scripts/backup.sh` dumps MongoDB and rsyncs the photo directory nightly,
keeping 30 daily snapshots. Photos are hard-linked against the previous
snapshot, so unchanged files cost no additional disk.

Rate limits: 5 signups and 5 reset requests per IP per hour, 20 login attempts
per 15 minutes, plus a broad 600-request backstop.

## Tests

```sh
npm test
npm run test-coverage
```

Tests mock `objRepo` and the Express `req`/`res` objects, so no MongoDB
instance is needed.

## Regenerating generated files

```sh
npm run gen:countries   # rebuilds lib/countries.js from Node's ICU data
npm run gen:map         # refreshes public/world-50m.json from world-atlas
```

## Deploying

`docker-compose.bucketlist.yml` defines the app and its own MongoDB. Both join
an existing external Docker network so a reverse proxy can reach the app by
container name, and neither publishes a port, so nothing is exposed to the LAN
directly.

```sh
cp .env.example .env    # set SESSION_SECRET and PUBLIC_BASE_URL
docker compose -f docker-compose.bucketlist.yml up -d --build
docker compose -f docker-compose.bucketlist.yml exec bucketlist \
  node scripts/createUser.js --email you@example.com --handle you --verified
```

### Serving under a subpath

Set `BASE_PATH=/adventures` and the app mounts itself there: routes, static
assets, cookies and generated links all move together, and the session cookie is
scoped to the prefix so it is not sent to anything else on the same origin.

`deploy/nginx-custom-location.conf` is the matching nginx snippet. For Nginx
Proxy Manager, drop it at `/data/nginx/custom/server_proxy.conf` — that file is
included in every proxy server block, so the routing survives restarts and
upgrades without touching NPM's database, and deleting it reverts cleanly.

### Backups

`scripts/backup.sh` run nightly from cron. Restore is a plain `mongorestore`:

```sh
docker exec -i bucketlist-mongo mongorestore --archive --gzip --drop \
  < backups/bucketlist/YYYY-MM-DD/mongo.archive.gz
```

## License

MIT — see [LICENSE](LICENSE).
