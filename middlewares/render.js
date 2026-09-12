/**
 * Terminal middleware: renders an ejs view with res.locals.
 *
 * Any status a previous middleware set (400 for a rejected form, say) is left
 * alone, so a re-rendered form does not answer 200 OK.
 */
module.exports = (objRepo, view) => {
  return (req, res) => {
    res.render(view, res.locals);
  };
};
