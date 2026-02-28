import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'backend' }));

app.get('/api/simulate', async (_req, res) => {
  try {
    const r = await fetch(`${process.env.ML_URL || 'http://localhost:8000'}/simulate`);
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/infer', async (req, res) => {
  try {
    const payload = req.body;
    const r = await fetch(`${process.env.ML_URL || 'http://localhost:8000'}/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`backend listening on :${port}`));
