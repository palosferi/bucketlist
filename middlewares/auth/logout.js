const config = require('../../lib/config');
module.exports = () => {
  return (req, res, next) => {
    if (!req.session) return res.redirect('/');
    return req.session.destroy((err) => {
      if (err) return next(err);
      // Must match the path the cookie was set with, or the browser keeps a
      // scoped bl.sid behind after the server-side session is gone.
      res.clearCookie('bl.sid', { path: config.basePath || '/' });
      return res.redirect('/');
    });
  };
};
