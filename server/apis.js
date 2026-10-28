// All API routes in one place. Everything here is served under /api (see app.js).
const express = require('express');

const router = express.Router();

router.use('/health', require('./routes/health'));       // GET  /api/health
router.use('/auth', require('./routes/auth'));            // POST /api/auth/register|login|logout, GET /api/auth/me
router.use('/config', require('./routes/config'));        // GET  /api/config
router.use('/batches', require('./routes/batches'));      // POST /api/batches, GET /api/batches/mine, GET /api/batches,
                                                          // PATCH /api/batches/:batch_number/verify
router.use('/payments', require('./routes/payments'));    // POST /api/payments
router.use('/reports', require('./routes/reports'));      // POST /api/reports/log
router.use('/audit-logs', require('./routes/audit'));     // GET  /api/audit-logs

module.exports = router;
