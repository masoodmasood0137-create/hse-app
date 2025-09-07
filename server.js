/*
Simple Express backend using lowdb (file JSON DB) for easy deployment.
Note: For production, use a real DB. This file intentionally stores data in /data/database.json
*/
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbFile = path.join(dataDir, 'database.json');

const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDb(){
  await db.read();
  db.data = db.data || { labours: [], attendance: [], payments: [], shifts: [] };
  await db.write();
}
initDb();

// API endpoints
app.get('/api/ping', (_req, res) => res.json({ ok: true }));

app.post('/api/labours', async (req, res) => {
  const { name, hourly_rate, shift } = req.body;
  if(!name) return res.status(400).json({ error: 'name required' });
  await db.read();
  const labour = { id: nanoid(), name, hourly_rate: Number(hourly_rate)||0, shift: shift||'' };
  db.data.labours.push(labour);
  await db.write();
  res.json(labour);
});

app.get('/api/labours', async (_req, res) => {
  await db.read();
  res.json(db.data.labours || []);
});

app.post('/api/attendance', async (req, res) => {
  const { labour_id, date, hours } = req.body;
  if(!labour_id || !date) return res.status(400).json({ error: 'labour_id and date required' });
  await db.read();
  const rec = { id: nanoid(), labour_id, date, hours: Number(hours)||0 };
  db.data.attendance.push(rec);
  await db.write();
  res.json(rec);
});

app.get('/api/attendance', async (req, res) => {
  const { labour_id, from, to } = req.query;
  await db.read();
  let rows = db.data.attendance || [];
  if(labour_id) rows = rows.filter(r => r.labour_id === labour_id);
  if(from && to) rows = rows.filter(r => r.date >= from && r.date <= to);
  res.json(rows);
});

app.post('/api/payments', async (req, res) => {
  const { labour_id, amount, date, notes } = req.body;
  if(!labour_id || !amount) return res.status(400).json({ error: 'labour_id and amount required' });
  await db.read();
  const rec = { id: nanoid(), labour_id, amount: Number(amount), date: date||new Date().toISOString().slice(0,10), notes: notes||'' };
  db.data.payments.push(rec);
  await db.write();
  res.json(rec);
});

app.get('/api/payments', async (req, res) => {
  const { labour_id } = req.query;
  await db.read();
  let rows = db.data.payments || [];
  if(labour_id) rows = rows.filter(r => r.labour_id === labour_id);
  res.json(rows);
});

app.post('/api/calc-wages', async (req, res) => {
  const { labour_id, from, to } = req.body;
  if(!labour_id || !from || !to) return res.status(400).json({ error: 'labour_id, from and to required' });
  await db.read();
  const att = (db.data.attendance || []).filter(a => a.labour_id===labour_id && a.date>=from && a.date<=to);
  const lab = (db.data.labours || []).find(l=>l.id===labour_id);
  const base = lab ? (lab.hourly_rate||0) : 0;
  let total = 0;
  const breakdown = att.map(a => {
    const regular = Math.min(a.hours,8);
    const overtime = Math.max(a.hours-8,0);
    const dayPay = regular*base + overtime*base*1.5;
    total += dayPay;
    return { date: a.date, hours: a.hours, dayPay: Number(dayPay.toFixed(2)) };
  });
  res.json({ labour_id, from, to, total: Number(total.toFixed(2)), breakdown });
});

// Fallback: serve index.html for SPA routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server (for local testing)
// When deployed to serverless platforms, this won't be used, but Vercel can run it with @vercel/node if needed.
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', ()=> console.log('HSE server running on port', PORT));
