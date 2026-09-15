const multer = require('multer');

const loadCurrentUserMW = require('../middlewares/auth/loadCurrentUser');
const verifyEmailMW = require('../middlewares/auth/verifyEmail');
const sendVerificationMW = require('../middlewares/auth/sendVerification');
const requestResetMW = require('../middlewares/auth/requestReset');
const resetPasswordMW = require('../middlewares/auth/resetPassword');
const changePasswordMW = require('../middlewares/account/changePassword');
const exportDataMW = require('../middlewares/account/exportData');
const deleteAccountMW = require('../middlewares/account/deleteAccount');
const requireAuthMW = require('../middlewares/auth/requireAuth');
const signupMW = require('../middlewares/auth/signup');
const loginMW = require('../middlewares/auth/login');
const logoutMW = require('../middlewares/auth/logout');

const loadListsMW = require('../middlewares/lists/loadLists');
const loadListMW = require('../middlewares/lists/loadList');
const saveListMW = require('../middlewares/lists/saveList');
const deleteListMW = require('../middlewares/lists/deleteList');

const loadAdventuresMW = require('../middlewares/adventures/loadAdventures');
const loadAdventureMW = require('../middlewares/adventures/loadAdventure');
const saveAdventureMW = require('../middlewares/adventures/saveAdventure');
const deleteAdventureMW = require('../middlewares/adventures/deleteAdventure');

const uploadPhotosMW = require('../middlewares/photos/uploadPhotos');
const deletePhotoMW = require('../middlewares/photos/deletePhoto');
const servePhotoMW = require('../middlewares/photos/servePhoto');

const loadPublicProfileMW = require('../middlewares/public/loadPublicProfile');
const loadSharedListMW = require('../middlewares/public/loadSharedList');

const renderMW = require('../middlewares/render');
const csrf = require('../middlewares/csrf');
const { verifyCsrf } = require('../middlewares/csrf');

const photoStoreLib = require('../lib/photoStore');
const { COUNTRIES, countryName, ALPHA2_TO_NUMERIC } = require('../lib/countries');
const config = require('../lib/config');

const UserModel = require('../models/user');
const ListModel = require('../models/list');
const AdventureModel = require('../models/adventure');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: photoStoreLib.MAX_UPLOAD_BYTES, files: photoStoreLib.MAX_PHOTOS_PER_ADVENTURE },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|avif|heic|heif|gif|tiff)$/.test(file.mimetype)) return cb(null, true);
    return cb(Object.assign(new Error('Only image files can be uploaded.'), { status: 400 }));
  },
});

function subscribeToRoutes(app) {
  const objRepo = {
    UserModel,
    ListModel,
    AdventureModel,
    photoStore: photoStoreLib.create(UserModel),
  };

  const requireAuth = requireAuthMW(objRepo);

  // Available to every template.
  app.use((req, res, next) => {
    res.locals.countries = COUNTRIES;
    res.locals.countryName = countryName;
    res.locals.alpha2ToNumeric = ALPHA2_TO_NUMERIC;
    res.locals.query = req.query;
    res.locals.errors = {};
    res.locals.form = {};
    res.locals.brand = config.brand;
    // Templates build every internal link through u() so the mount point is
    // applied in exactly one place.
    res.locals.u = config.path;
    res.locals.basePath = config.basePath;
    res.locals.signupsOpen = config.signupsOpen;
    res.locals.contactEmail = config.contactEmail;
    res.locals.quotaMb = Math.round(photoStoreLib.quotaBytes() / 1048576);
    // One-shot flash message, consumed on render.
    res.locals.flash = req.session && req.session.flash ? req.session.flash : null;
    if (req.session && req.session.flash) delete req.session.flash;
    next();
  });
  app.use(loadCurrentUserMW(objRepo));
  app.use(csrf());

  // --- public ---------------------------------------------------------------
  app.get('/', (req, res) => {
    if (res.locals.currentUser) return res.redirect('/lists');
    return res.render('landing', res.locals);
  });

  app.get('/privacy', renderMW(objRepo, 'privacy'));
  app.get('/terms', renderMW(objRepo, 'terms'));

  app.get('/u/:handle', loadPublicProfileMW(objRepo), renderMW(objRepo, 'profile'));
  app.get('/shared/:listId', loadSharedListMW(objRepo), renderMW(objRepo, 'sharedList'));
  app.get('/photos/:filename', servePhotoMW(objRepo));

  // --- auth -----------------------------------------------------------------
  // Signups are closed unless SIGNUPS_OPEN=true. The whole feature stays wired
  // up behind the flag, so opening the service later is a restart, not a
  // deploy of new code.
  app.get('/signup', redirectIfLoggedIn, signupsGate, renderMW(objRepo, 'signup'));
  app.post('/signup', redirectIfLoggedIn, signupsGate, signupMW(objRepo), renderMW(objRepo, 'signup'));
  app.get('/login', redirectIfLoggedIn, renderMW(objRepo, 'login'));
  app.post('/login', redirectIfLoggedIn, loginMW(objRepo), renderMW(objRepo, 'login'));
  app.post('/logout', logoutMW(objRepo));

  // --- email verification ----------------------------------------------------
  app.get('/verify', verifyEmailMW(objRepo), renderMW(objRepo, 'verify'));
  app.post('/verify/resend', requireAuth, sendVerificationMW(objRepo));

  // --- password reset --------------------------------------------------------
  app.get('/forgot', redirectIfLoggedIn, renderMW(objRepo, 'forgot'));
  app.post('/forgot', redirectIfLoggedIn, requestResetMW(objRepo), renderMW(objRepo, 'forgot'));
  app.get('/reset', redirectIfLoggedIn, resetPasswordMW(objRepo), renderMW(objRepo, 'reset'));
  app.post('/reset', redirectIfLoggedIn, resetPasswordMW(objRepo), renderMW(objRepo, 'reset'));

  // --- account settings ------------------------------------------------------
  app.get('/settings', requireAuth, renderMW(objRepo, 'settings'));
  app.post('/settings/password', requireAuth, changePasswordMW(objRepo), renderMW(objRepo, 'settings'));
  app.get('/settings/export', requireAuth, exportDataMW(objRepo));
  app.post('/settings/delete', requireAuth, deleteAccountMW(objRepo), renderMW(objRepo, 'settings'));

  // --- lists ----------------------------------------------------------------
  app.get('/lists', requireAuth, loadListsMW(objRepo), renderMW(objRepo, 'lists'));
  app.get('/lists/new', requireAuth, renderMW(objRepo, 'listForm'));
  app.post('/lists/new', requireAuth, saveListMW(objRepo), renderMW(objRepo, 'listForm'));
  app.get('/lists/:listId', requireAuth, loadListMW(objRepo), renderMW(objRepo, 'list'));
  app.get('/lists/:listId/edit', requireAuth, loadListMW(objRepo), renderMW(objRepo, 'listForm'));
  app.post('/lists/:listId/edit', requireAuth, loadListMW(objRepo), saveListMW(objRepo), renderMW(objRepo, 'listForm'));
  app.post('/lists/:listId/delete', requireAuth, loadListMW(objRepo), deleteListMW(objRepo), loadListsMW(objRepo), renderMW(objRepo, 'lists'));

  // --- adventures -----------------------------------------------------------
  app.get('/adventures', requireAuth, loadAdventuresMW(objRepo), renderMW(objRepo, 'adventures'));
  app.get('/adventures/new', requireAuth, loadListsMW(objRepo), renderMW(objRepo, 'adventureForm'));
  app.post('/adventures/new', requireAuth, loadListsMW(objRepo), saveAdventureMW(objRepo), renderMW(objRepo, 'adventureForm'));
  app.get('/adventures/:id/edit', requireAuth, loadAdventureMW(objRepo), renderMW(objRepo, 'adventureForm'));
  app.post('/adventures/:id/edit', requireAuth, loadAdventureMW(objRepo), saveAdventureMW(objRepo), renderMW(objRepo, 'adventureForm'));
  app.post('/adventures/:id/delete', requireAuth, loadAdventureMW(objRepo), deleteAdventureMW(objRepo));

  // --- photos ---------------------------------------------------------------
  app.post(
    '/adventures/:id/photos',
    requireAuth,
    loadAdventureMW(objRepo),
    upload.array('photos', photoStoreLib.MAX_PHOTOS_PER_ADVENTURE),
    // Must follow multer: the token is in the multipart body it just parsed.
    verifyCsrf(),
    uploadPhotosMW(objRepo),
    renderMW(objRepo, 'adventureForm')
  );
  app.post('/adventures/:id/photos/:photoId/delete', requireAuth, loadAdventureMW(objRepo), deletePhotoMW(objRepo));

  // --- 404 ------------------------------------------------------------------
  app.use((req, res) => {
    res.status(404).render('404', res.locals);
  });

  // --- errors ---------------------------------------------------------------
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;

    if (status >= 500) {
      console.error('[error]', req.method, req.originalUrl, err.stack || err);
    } else {
      console.warn('[warn]', req.method, req.originalUrl, err.message);
    }

    if (res.headersSent) return next(err);

    res.status(status);
    res.locals.status = status;
    res.locals.message =
      status >= 500 ? 'Something went wrong on our end.' : err.message || 'Bad request.';
    return res.render('error', res.locals);
  });
}

function signupsGate(req, res, next) {
  if (config.signupsOpen) return next();
  res.status(403);
  return res.render('signupsClosed', res.locals);
}

function redirectIfLoggedIn(req, res, next) {
  if (res.locals.currentUser) return res.redirect('/lists');
  return next();
}

module.exports = subscribeToRoutes;
