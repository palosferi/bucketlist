/**
 * ejs-t ad ki
 * @param objRepo
 * @param view
 * @returns {function(*, *, *): * }
 */
module.exports = (objRepo, view) => {
    return (req, res, next)=>{
        //return next();
        res.render(view,{});
    }
}