# Bucketlist

A small server-rendered web app for logging bucketlist adventures and the
places they happen in. You can create, edit and delete **adventures** (name,
type, date, description, and the location they belong to) and **locations**
(name, country, latitude, longitude, link). Adventures list the location they
reference, and locations are reusable across adventures.

## Architecture: middleware factories

Every piece of request handling is an Express middleware produced by a factory
function. A module under `middlewares/` does not export a middleware directly —
it exports a function that takes an object repository (`objRepo`) and returns
the actual `(req, res, next)` middleware:

```js
module.exports = (objRepo) => {
    const AdventureModel = objRepo.AdventureModel;
    return (req, res, next) => { /* ... */ };
};
```

`objRepo` is assembled once in [routing/routing.js](routing/routing.js) and
holds the Mongoose models. Because the models are injected rather than
required inside the middleware, tests can pass a fake repository with
`jest.fn()` stubs and exercise the middleware without a database.

Routes are then composed from these factories as small chains, each step
writing its result onto `res.locals` for the next one:

```js
app.get('/adventures', loadAdventuresMW(objRepo), renderMW(objRepo, 'adventures'));
app.use('/adventure/edit/:id',
    loadAdventureMW(objRepo),
    loadLocationsMW(objRepo),
    saveAdventureMW(objRepo),
    renderMW(objRepo, 'adventure'));
```

The `save*` middlewares are no-ops on `GET` — if the expected fields are
missing from `req.body` they simply call `next()`, so the same chain serves
both the form and its submission. `renderMW(objRepo, view)` is the terminal
step and renders the matching ejs view with `res.locals`. Errors are passed to
`next` and handled by the error middleware at the end of `routing.js`.

```
index.js            app setup, body parsing, static files, listen
routing/routing.js  objRepo + route composition
middlewares/        middleware factories (adventures/, locations/, render.js)
models/             Mongoose models (Adventure, Location)
config/db.js        Mongoose connection
views/              ejs templates
public/             static assets
tests/              Jest tests, mirroring the middlewares/ layout
```

## Stack

- Node.js + Express 4
- MongoDB with Mongoose 8
- ejs templates
- body-parser
- Jest for tests, nodemon for development

## Prerequisites

- Node.js >= 18
- A running MongoDB instance the app can reach. Anything works — a local
  install, or a container:

  ```sh
  docker run -d --name mongo -p 27017:27017 mongo:7
  ```

  The app connects on startup, so start MongoDB before `npm start`.

## Install

```sh
git clone https://github.com/palosferi/bucketlist.git
cd bucketlist
npm install
```

## Environment variables

Both are optional and fall back to the defaults below. The default connection
string uses `127.0.0.1` rather than `localhost` on purpose: `localhost` can
resolve to `::1` first, and some MongoDB setups (a container published with
rootless podman, for example) only accept connections over IPv4.

| Variable | Default | Description |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/bucketlist` | MongoDB connection string |
| `PORT` | `3000` | Port the HTTP server listens on |

## Running

```sh
npm start
```

Starts the app with nodemon (restarts on file changes) at
http://localhost:3000, which redirects to `/adventures`.

## Tests

```sh
npm test              # run the Jest suite
npm run test-coverage # run with a coverage report
```

The tests mock `objRepo` and the Express `req`/`res` objects, so no MongoDB
instance is needed to run them.

## License

MIT — see [LICENSE](LICENSE).
