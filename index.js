const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.set('view engine', 'ejs');

const subscribeToRoutes = require('./routing/routing.js');
subscribeToRoutes(app);

app.use(express.static('public'));

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
