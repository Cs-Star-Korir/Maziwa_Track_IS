// Starts the MaziwaTrack API:  npm start  (or  npm run server  to restart on every change)
// Settings come from the single .env file in the project root (next to package.json)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const missing = ['DB_USER', 'DB_NAME', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing settings in .env: ${missing.join(', ')}. Copy .env.example to .env in the project root (next to package.json) and fill it in.`);
  process.exit(1);
}

const app = require('./app');
const { pool } = require('./db');

const PORT = Number(process.env.PORT || 5000);

pool.query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => console.log(`MaziwaTrack API running on http://localhost:${PORT}/api`));
  })
  .catch((err) => {
    console.error(`Cannot connect to the database "${process.env.DB_NAME}": ${err.message}`);
    console.error('Is MySQL running (XAMPP) and are DB_USER / DB_PASSWORD in .env correct?');
    process.exit(1);
  });
