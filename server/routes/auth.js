import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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

/* POST /api/auth/forgot-password */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const generic = { message: 'If an account exists for that email, a reset link has been sent.' };

  try {
    const [rows] = await pool.query(
      `SELECT id, email FROM users WHERE email = ? LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    // Always respond the same way — don't reveal whether the account exists
    if (!user) return res.json(generic);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    // Invalidate any previous unused tokens for this user
    await pool.query(`UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0`, [user.id]);
    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [user.id, tokenHash, expiresAt]
    );

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontend}/reset-password?token=${rawToken}`;

    // No mailer configured yet — log it so you can test locally
    console.log(`[auth] password reset for ${user.email}: ${resetUrl}`);

    return res.json(generic);
  } catch (err) {
    console.error('[auth] forgot-password failed:', err);
    return res.status(500).json({ error: 'Could not send reset link' });
  }
});

/* POST /api/auth/reset-password */
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used
         FROM password_resets
        WHERE token_hash = ? LIMIT 1`,
      [tokenHash]
    );
    const reset = rows[0];

    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, reset.user_id]);
    await pool.query(`UPDATE password_resets SET used = 1 WHERE id = ?`, [reset.id]);

    return res.json({ message: 'Password updated. You can now sign in.' });
  } catch (err) {
    console.error('[auth] reset-password failed:', err);
    return res.status(500).json({ error: 'Could not reset password' });
  }
});

export default router;