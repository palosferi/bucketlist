const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');

const subscribeToRoutes = require('./routing/routing.js');
subscribeToRoutes(app);

app.use(express.static('public'));

app.listen(3000, () => {
    console.log(`Server is running at http://localhost:3000`);
});
