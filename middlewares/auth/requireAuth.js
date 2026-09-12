/**
 * Gate for anything that touches a user's own data. Remembers where the
 * visitor was heading so login can send them back there.
 */
module.exports = () => {
  return (req, res, next) => {
    if (res.locals.currentUser) return next();
    // req.session can be gone here: loadCurrentUser destroys a session that
    // was invalidated by a password change before handing control over.
    if (req.method === 'GET' && req.session) req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  };
};
