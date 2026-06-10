require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/parking', require('./routes/parking'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function initDB() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database inizializzato');
}

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => app.listen(PORT, () => console.log(`Server avviato su porta ${PORT}`)))
  .catch(err => { console.error('Errore DB:', err); process.exit(1); });
