import express from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

/* ================================================================ */
/* GET /api/notifications                                           */
/* Current user's notifications, newest first (unread on top)       */
/* ================================================================ */
router.get('/', requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, body, link, is_read, created_at
         FROM notifications
        WHERE user_id = ?
        ORDER BY is_read ASC, created_at DESC
        LIMIT ?`,
      [req.user.id, limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('[notifications] list failed:', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

/* ================================================================ */
/* GET /api/notifications/unread-count                              */
/* ================================================================ */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ count: Number(rows[0].count) || 0 });
  } catch (err) {
    console.error('[notifications] count failed:', err);
    res.status(500).json({ error: 'Failed to count notifications' });
  }
});

/* ================================================================ */
/* POST /api/notifications/:id/read                                 */
/* ================================================================ */
router.post('/:id/read', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid notification id' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error('[notifications] mark read failed:', err);
    res.status(500).json({ error: 'Failed to mark notification' });
  }
});

/* ================================================================ */
/* POST /api/notifications/read-all                                 */
/* ================================================================ */
router.post('/read-all', requireAuth, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );
    res.json({ ok: true, updated: result.affectedRows });
  } catch (err) {
    console.error('[notifications] mark all failed:', err);
    res.status(500).json({ error: 'Failed to mark all' });
  }
});

export default router;