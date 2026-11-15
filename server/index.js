import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import adminRouter from './routes/admin.js';
import itemsRouter from './routes/items.js';
import claimsRouter from './routes/claims.js';
import notificationsRouter from './routes/notifications.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded files at http://localhost:5000/uploads/<filename>
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/items', itemsRouter);
app.use('/api/claims', claimsRouter);
app.use('/api/notifications', notificationsRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));