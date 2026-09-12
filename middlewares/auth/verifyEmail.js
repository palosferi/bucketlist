const TokenModel = require('../../models/token');

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Consumes a verification token from ?token= and marks the address confirmed. */
module.exports = (objRepo) => {
  const UserModel = objRepo.UserModel;
  return async (req, res, next) => {
    try {
      const userId = await TokenModel.consume(req.query.token, 'verify-email');
      if (!userId) {
        res.status(400);
        res.locals.verifyState = 'invalid';
        return next();
      }

      await UserModel.updateOne(
        { _id: userId, emailVerifiedAt: null },
        { $set: { emailVerifiedAt: new Date() } }
      );

      res.locals.verifyState = 'ok';
      return next();
    } catch (err) {
      return next(err);
    }
  };
};

module.exports.VERIFY_TTL_MS = VERIFY_TTL_MS;
