// GET /api/config – settings the screens need (price per litre for the approve pop-up).
const express = require('express');
const { requireAuth } = require('./auth');

const router = express.Router();

const PRICE_PER_LITRE = () => Number(process.env.PRICE_PER_LITRE || 50);
const COOPERATIVE_NAME = () => process.env.COOPERATIVE_NAME || 'MaziwaTrack Dairy Cooperative';

router.get('/', requireAuth, (req, res) => {
  res.json({ price_per_litre: PRICE_PER_LITRE(), cooperative_name: COOPERATIVE_NAME() });
});

module.exports = router;
module.exports.PRICE_PER_LITRE = PRICE_PER_LITRE;
module.exports.COOPERATIVE_NAME = COOPERATIVE_NAME;
