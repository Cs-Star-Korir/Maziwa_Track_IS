// The Express app: security middleware, the API routes, and error handling.
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const apis = require('./apis');

const app = express();

app.disable('x-powered-by');
app.use(helmet()); // secure HTTP headers
app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(','), // the React app's address
  credentials: true, // allow the login cookie
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use('/api', apis);

// Unknown API route
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

// Any error thrown in a route ends up here.
// Errors created with a status (404, 409...) send their message; anything else is hidden from users.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

module.exports = app;
