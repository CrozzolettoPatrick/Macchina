const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// Parcheggio attivo corrente
router.get('/current', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM parkings WHERE user_id = $1 AND is_active = TRUE ORDER BY parked_at DESC LIMIT 1',
      [req.user.userId]
    );
    res.json(result.rows[0] || null);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Crea nuovo parcheggio (CHIUDI)
router.post('/', auth, async (req, res) => {
  const { lat, lng, note } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Coordinate GPS mancanti' });

  try {
    await pool.query(
      'UPDATE parkings SET is_active = FALSE, closed_at = NOW() WHERE user_id = $1 AND is_active = TRUE',
      [req.user.userId]
    );
    const result = await pool.query(
      'INSERT INTO parkings (user_id, lat, lng, note) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.userId, lat, lng, note || null]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Chiudi parcheggio (APRI / reset)
router.patch('/:id/close', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE parkings SET is_active = FALSE, closed_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Parcheggio non trovato' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

// Storico parcheggi
router.get('/history', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM parkings WHERE user_id = $1 ORDER BY parked_at DESC LIMIT 20',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Errore del server' });
  }
});

module.exports = router;
