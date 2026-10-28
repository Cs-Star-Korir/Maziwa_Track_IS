// POST /api/reports/log – records that an admin generated a report (FR5, audit trail).
// The report data itself comes from GET /api/batches with date filters.
const express = require('express');
const { pool, audit } = require('../db');
const { requireAuth, requireRole } = require('./auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.post('/log', async (req, res) => {
  const type = String(req.body.type || '').trim().slice(0, 60);
  if (!type) return res.status(400).json({ message: 'Report type is required.' });
  await audit(pool, req.user.user_id, 'GENERATE_REPORT', { newValue: { report: type } });
  res.status(201).json({ message: 'Report logged.' });
});

module.exports = router;
