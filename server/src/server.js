const app = require('./app');
const { port } = require('./config');

// Start the API on the port configured through the environment.
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
