const bcrypt = require('bcryptjs');
const TokenModel = require('../../models/token');

const BCRYPT_ROUNDS = 12;

/**
 * Completes a password reset.
 *
 * On GET the token is only checked for validity so the form can be shown or
 * refused. On POST it is consumed, the password replaced, and every other
 * session for that account invalidated.
 */
module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    // Express 5 leaves req.body undefined on a GET, and this middleware serves
    // both the form and its submission.
    const raw = String((req.body && req.body.token) || req.query.token || '');
    res.locals.token = raw;

    try {
      if (req.method !== 'POST') {
        const hash = TokenModel.hashToken(raw);
        const doc = raw
          ? await TokenModel.findOne({
              tokenHash: hash,
              purpose: 'reset-password',
              usedAt: null,
              expiresAt: { $gt: new Date() },
            })
          : null;
        res.locals.tokenValid = Boolean(doc);
        if (!doc) res.status(400);
        return next();
      }

      const password = String((req.body && req.body.password) || '');
      if (password.length < 10 || password.length > 200) {
        res.status(400);
        res.locals.tokenValid = true;
        res.locals.errors = { password: 'Use between 10 and 200 characters.' };
        return next();
      }

      const userId = await TokenModel.consume(raw, 'reset-password');
      if (!userId) {
        res.status(400);
        res.locals.tokenValid = false;
        return next();
      }

      await UserModel.updateOne(
        { _id: userId },
        {
          $set: {
            passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
            // Whoever reset it now controls the address, so confirm it too.
            emailVerifiedAt: new Date(),
            // Logs out every existing session: a reset is what someone does
            // when they believe the account was compromised.
            sessionsValidFrom: new Date(),
          },
        }
      );


      req.session.flash = 'Password changed — you can log in now.';
      return res.redirect('/login');
    } catch (err) {
      return next(err);
    }
  };
};

