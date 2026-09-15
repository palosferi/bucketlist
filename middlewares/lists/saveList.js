const crypto = require('crypto');
const { parseList, ValidationError } = require('../../lib/validate');

/** Creates or updates a list. No-op unless it is a POST carrying a name. */
module.exports = (objRepo) => {
  const ListModel = objRepo.ListModel;
  return async (req, res, next) => {
    if (req.method !== 'POST') return next();

    let fields;
    try {
      fields = parseList(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400);
        res.locals.errors = err.errors;
        res.locals.form = req.body;
        return next();
      }
      return next(err);
    }

    // Publishing exposes content to the internet under this account's email
    // address, so it requires a confirmed address. Private lists do not — you
    // can use the whole app unverified, you just cannot broadcast from it.
    if (fields.visibility !== 'private' && !res.locals.currentUser.isVerified()) {
      res.status(403);
      res.locals.errors = {
        form: 'Confirm your email address before sharing or publishing a list.',
      };
      res.locals.form = req.body;
      return next();
    }

    try {
      const list = res.locals.list || new ListModel({ _owner: res.locals.currentUser._id });
      list.name = fields.name;
      list.visibility = fields.visibility;
      list.color = fields.color;
      // An unlisted list needs a token; anything else must not keep one around.
      if (fields.visibility === 'unlisted' && !list.shareToken) {
        list.shareToken = crypto.randomBytes(16).toString('base64url');
      } else if (fields.visibility !== 'unlisted') {
        list.shareToken = undefined;
      }

      await list.save();
      return res.redirect(`/lists/${list._id}`);
    } catch (err) {
      return next(err);
    }
  };
};
