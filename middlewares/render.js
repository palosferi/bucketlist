/**
 * ejs-t ad ki
 * @param objRepo
 * @param view
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo, view) => {
    return (req, res, next) => {
      if (typeof res.locals[view] === 'undefined') {
        res.locals[view] = {};
      }
      res.render(view, res.locals);
    };
  };
  
  