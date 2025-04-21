/**
 * ejs-t ad ki
 * @param objRepo
 * @param view
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo, view) => {
    return (req, res, next)=>{
        if (typeof res.locals.adventure === 'undefined') {
            res.locals.adventure = {};
        }
        res.render(view,res.locals);
    }
}