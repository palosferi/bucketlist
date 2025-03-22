const express = require('express');
const app = express();
const PORT = 3000;

const subscribeToRoutes = require('./routing/routing.js');

app.use(express.static('public'));

subscribeToRoutes(app);

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
