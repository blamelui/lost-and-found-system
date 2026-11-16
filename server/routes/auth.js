import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { pool } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = express.Router();

/* POST /api/auth/register */
router.post('/register', async (req, res) => {
  const { fullname, student_id, email, password } = req.body || {};

  // ---- 1. Required fields ----
  if (!fullname || !email || !password || !student_id) {
    return res.status(400).json({ error: 'Full name, student ID, email, and password are required.' });
  }

  const name = String(fullname).trim();
  const studentId = String(student_id).trim().toUpperCase();
  const emailLower = String(email).trim().toLowerCase();

  // ---- 2. Server-side format validation (matches frontend LIMITS) ----
  // Name: 3-50 chars, letters + spaces + . ' - only, no digits
  if (!/^[A-Za-z\s.'-]{3,50}$/.test(name)) {
    return res.status(400).json({ error: 'Full name must be 3–50 characters and contain only letters.' });
  }

  // Student ID: length cap + strict format C-2024-0001
  if (studentId.length > 15) {
    return res.status(400).json({ error: 'Student ID must be 15 characters or fewer.' });
  }
  if (!/^[A-Z]-\d{4}-\d{3,4}$/.test(studentId)) {
    return res.status(400).json({ error: 'Student ID must look like C-2024-0001.' });
  }

  // Email format
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(emailLower)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // Password strength (matches frontend LIMITS.passwordMinLength)
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
    return res.status(400).json({ error: 'Password must contain at least 1 uppercase letter and 1 number.' });
  }
  if (/\s/.test(password)) {
    return res.status(400).json({ error: 'Password cannot contain spaces.' });
  }

  // Username derived from email prefix (must not contain spaces)
  const username = emailLower.split('@')[0].replace(/\s+/g, '');
  if (!username) {
    return res.status(400).json({ error: 'Could not derive a username from that email.' });
  }

  try {
    // ---- 3. Duplicate checks ----
    const [existingEmail] = await pool.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [emailLower]
    );
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    const [existingId] = await pool.query(
      'SELECT id FROM users WHERE student_id = ? LIMIT 1',
      [studentId]
    );
    if (existingId.length > 0) {
      return res.status(409).json({ error: 'This Student ID is already in use.' });
    }

    const [existingName] = await pool.query(
      'SELECT id FROM users WHERE full_name = ? LIMIT 1',
      [name]
    );
    if (existingName.length > 0) {
      return res.status(409).json({ error: 'An account with this name already exists.' });
    }

    const [existingUsername] = await pool.query(
      'SELECT id FROM users WHERE username = ? LIMIT 1',
      [username]
    );
    if (existingUsername.length > 0) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    // ---- 4. Create the user ----
    const hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query(
      `INSERT INTO users (username, full_name, student_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'student')`,
      [username, name, studentId, emailLower, hash]
    );

    const [rows] = await pool.query(
      `SELECT id, username, full_name, student_id, email, role FROM users WHERE id = ?`,
      [r.insertId]
    );
    const user = rows[0];
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = String(err.message || '').toLowerCase();
      if (msg.includes('email')) return res.status(409).json({ error: 'This email is already registered.' });
      if (msg.includes('student_id')) return res.status(409).json({ error: 'This Student ID is already in use.' });
      if (msg.includes('full_name')) return res.status(409).json({ error: 'An account with this name already exists.' });
      if (msg.includes('username')) return res.status(409).json({ error: 'That username is already taken.' });
      return res.status(409).json({ error: 'An account with these details already exists.' });
    }
    console.error('[auth] register failed:', err);
    res.status(500).json({ error: 'Registration failed.' });
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

    if (!user) return res.json(generic);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await pool.query(`UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0`, [user.id]);
    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [user.id, tokenHash, expiresAt]
    );

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontend}/reset-password?token=${rawToken}`;

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