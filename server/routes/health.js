// GET /api/health – quick check that the server and the database are up (for monitoring).
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});

module.exports = router;
