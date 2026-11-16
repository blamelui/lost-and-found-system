import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

/* ---------- Multer (supporting proof upload) ---------- */
const uploadsDir = path.resolve('server', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `claim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!ok) return cb(new Error('Only JPG, PNG, or WEBP allowed'));
    cb(null, true);
  },
});

/* ================================================================ */
/* POST /api/claims — submit a claim on a found item                */
/* ================================================================ */
router.post('/', requireAuth, upload.single('supporting_image'), async (req, res) => {
  const { item_id, proof, lost_context, phone } = req.body || {};

  if (!item_id) return res.status(400).json({ error: 'item_id is required' });
  if (!proof || !String(proof).trim()) return res.status(400).json({ error: 'proof is required' });
  if (String(proof).trim().length < 20) {
    return res.status(400).json({ error: 'Please describe the item in more detail (at least 20 characters).' });
  }

  const itemId = Number(item_id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [itemRows] = await conn.query(
      `SELECT id, user_id, status FROM items WHERE id = ?`,
      [itemId]
    );
    if (itemRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = itemRows[0];

    if (item.status !== 'found') {
      await conn.rollback();
      return res.status(400).json({ error: 'This item is not currently claimable.' });
    }

    // FIX: Cast both sides to Number — MySQL returns user_id as number,
    // JWT may store id as string. "5" === 5 is false; Number("5") === Number(5) is true.
    if (Number(item.user_id) === Number(req.user.id)) {
      await conn.rollback();
      return res.status(400).json({ error: 'You cannot claim an item you reported.' });
    }

    const [existing] = await conn.query(
      `SELECT id FROM claims WHERE item_id = ? AND claimant_id = ? AND status = 'pending' LIMIT 1`,
      [itemId, req.user.id]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'You already have a pending claim on this item.' });
    }

    const [approved] = await conn.query(
      `SELECT id FROM claims WHERE item_id = ? AND status = 'approved' LIMIT 1`,
      [itemId]
    );
    if (approved.length > 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'This item has already been returned to its owner.' });
    }

    const supportingImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await conn.query(
      `INSERT INTO claims
        (item_id, claimant_id, proof, phone, lost_context, supporting_image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        itemId,
        req.user.id,
        String(proof).trim(),
        phone ? String(phone).trim() : null,
        lost_context ? String(lost_context).trim() : null,
        supportingImageUrl,
      ]
    );

    const claimId = result.insertId;

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'claim_submitted', ?, ?, ?)`,
      [
        req.user.id,
        'Claim submitted',
        'Your claim has been submitted. School staff will review your proof of ownership and notify you with pickup instructions once verified.',
        `/claims`,
      ]
    );

    const [admins] = await conn.query(`SELECT id FROM users WHERE role = 'admin'`);
    if (admins.length > 0) {
      const [itemInfo] = await conn.query(`SELECT title FROM items WHERE id = ?`, [itemId]);
      const title = itemInfo[0]?.title || 'an item';
      const adminValues = admins.map((a) => [
        a.id,
        'new_claim_pending',
        'New claim awaiting review',
        `A claim was submitted on "${title}".`,
        '/admin',
      ]);
      await conn.query(
        `INSERT INTO notifications (user_id, type, title, body, link) VALUES ?`,
        [adminValues]
      );
    }

    await conn.commit();

    res.status(201).json({
      id: claimId,
      status: 'pending',
      proof: String(proof).trim(),
      lost_context: lost_context || null,
      supporting_image_url: supportingImageUrl,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    await conn.rollback();
    console.error('[claims] submit failed:', err);
    res.status(500).json({ error: 'Failed to submit claim' });
  } finally {
    conn.release();
  }
});

/* ================================================================ */
/* GET /api/claims/mine — current user's claims                     */
/* ================================================================ */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.status, c.claim_date, c.proof, c.lost_context,
              c.supporting_image_url, c.phone, c.reject_reason,
              i.id AS item_id,
              COALESCE(i.title, '(item removed)') AS item_title,
              i.image_url AS item_image_url, i.category AS item_category,
              i.status AS item_status, i.last_location AS item_last_location,
              i.lost_at AS item_found_at
         FROM claims c
         LEFT JOIN items i ON i.id = c.item_id
        WHERE c.claimant_id = ?
        ORDER BY c.claim_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[claims] list mine failed:', err);
    res.status(500).json({ error: 'Failed to load claims' });
  }
});

/* Multer error handling */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only JPG, PNG, or WEBP allowed') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;