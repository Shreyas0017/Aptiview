import express from 'express';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Routes are working!' });
});

export default router;
