module.exports = () => {
  return (req, res, next) => {
    if (!req.session) return res.redirect('/');
    return req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('bl.sid');
      return res.redirect('/');
    });
  };
};
