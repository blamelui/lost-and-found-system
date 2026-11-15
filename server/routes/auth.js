import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = express.Router();

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  const { fullname, student_id, email, password } = req.body || {};

  if (!fullname || !email || !password) {
    return res.status(400).json({ error: 'fullname, email, and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const username = email.split('@')[0].toLowerCase();

  try {
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      `INSERT INTO users (username, full_name, student_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'student')`,
      [username, fullname.trim(), (student_id || '').trim() || null, email.toLowerCase().trim(), hash]
    );
    const [rows] = await pool.query(
      `SELECT id, username, full_name, student_id, email, role FROM users WHERE id = ?`,
      [r.insertId]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = String(err.message || '');
      if (msg.includes('email')) {
        return res.status(409).json({ error: 'That email is already registered' });
      }
      return res.status(409).json({ error: 'That username is already taken' });
    }
    console.error('[auth] register failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/* POST /api/auth/login */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const [rows] = await pool.query(
      `SELECT id, username, full_name, student_id, email, role, password_hash
         FROM users
        WHERE username = ? OR email = ?`,
      [username, username.toLowerCase()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({
      token: signToken(user),
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        student_id: user.student_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[auth] login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/* GET /api/auth/me */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, full_name, student_id, email, role
         FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User no longer exists' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[auth] me failed:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;