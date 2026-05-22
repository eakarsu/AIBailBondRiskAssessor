const express = require('express');
const router = express.Router();

let rows = [
  { id: 1, defendant: 'D-1044', collateral: 'Vehicle title', valueUsd: 18000, lienStatus: 'verified', custodian: 'Main office', status: 'clear' },
  { id: 2, defendant: 'D-1081', collateral: 'Property deed', valueUsd: 125000, lienStatus: 'county search pending', custodian: 'Escrow', status: 'review' },
  { id: 3, defendant: 'D-1090', collateral: 'Cash bond', valueUsd: 7500, lienStatus: 'held', custodian: 'Trust account', status: 'clear' }
];

router.get('/', (_req, res) => {
  const summary = rows.reduce((acc, r) => {
    acc.total += 1;
    acc.valueUsd += Number(r.valueUsd || 0);
    acc.review += r.status === 'review' ? 1 : 0;
    return acc;
  }, { total: 0, valueUsd: 0, review: 0 });
  res.json({ rows, summary });
});

router.post('/', (req, res) => {
  const item = { id: Date.now(), defendant: req.body.defendant || 'D-pending', collateral: req.body.collateral || 'Collateral TBD', valueUsd: Number(req.body.valueUsd || 0), lienStatus: req.body.lienStatus || 'pending', custodian: req.body.custodian || 'Unassigned', status: req.body.status || 'review' };
  rows = [item, ...rows];
  res.status(201).json(item);
});

module.exports = router;
