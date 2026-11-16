import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = express.Router();

/* ---------- Multer setup ---------- */
const uploadsDir = path.resolve('server', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
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
/* LOST ITEMS                                                       */
/* ================================================================ */

router.post('/lost', requireAuth, upload.single('photo'), async (req, res) => {
  const {
    title, brand, color, category, category_other,
    description, last_location, lost_at, urgency,
    reporter_role, contact_pref, quantity,
  } = req.body || {};

  if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
  if (!description || !String(description).trim()) return res.status(400).json({ error: 'description is required' });
  if (!last_location || !String(last_location).trim()) return res.status(400).json({ error: 'last_location is required' });

  const validCategories = ['electronics', 'clothing', 'bottles', 'books', 'keys_ids', 'sports', 'other'];
  if (!category || !validCategories.includes(category)) return res.status(400).json({ error: 'invalid category' });
  if (category === 'other' && (!category_other || !String(category_other).trim())) {
    return res.status(400).json({ error: 'category_other is required when category is "other"' });
  }

  const validRoles = ['student', 'parent', 'staff'];
  if (!reporter_role || !validRoles.includes(reporter_role)) return res.status(400).json({ error: 'invalid reporter_role' });

  const validContactPrefs = ['email', 'student_id'];
  if (!contact_pref || !validContactPrefs.includes(contact_pref)) return res.status(400).json({ error: 'invalid contact_pref' });

  let urgencyValue = urgency || 'normal';
  if (!['low', 'normal', 'high'].includes(urgencyValue)) return res.status(400).json({ error: 'invalid urgency' });
  if (!urgency && ['keys_ids', 'electronics'].includes(category)) urgencyValue = 'high';

  let quantityValue = 1;
  if (quantity !== undefined && quantity !== '' && quantity !== null) {
    const n = Number(quantity);
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      return res.status(400).json({ error: 'Quantity must be a whole number between 1 and 999.' });
    }
    quantityValue = n;
  }

  let lostAtValue = new Date();
  if (lost_at) {
    const parsed = new Date(lost_at);
    if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'invalid lost_at' });
    lostAtValue = parsed;
  }

  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO items
        (user_id, title, quantity, brand, color, category, category_other,
         description, image_url, last_location, lost_at, urgency,
         reporter_role, contact_pref, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'lost')`,
      [
        req.user.id, String(title).trim(), quantityValue,
        brand ? String(brand).trim() : null,
        color ? String(color).trim() : null,
        category,
        category === 'other' ? String(category_other).trim() : null,
        String(description).trim(), imageUrl,
        String(last_location).trim(), lostAtValue, urgencyValue,
        reporter_role, contact_pref,
      ]
    );

    const itemId = result.insertId;

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'lost_report_received', ?, ?, ?)`,
      [req.user.id, 'Lost item report received',
       `Your report for "${String(title).trim()}" has been recorded.`, `/items/${itemId}`]
    );

    if (urgencyValue === 'high') {
      const [admins] = await conn.query(`SELECT id FROM users WHERE role = 'admin'`);
      if (admins.length > 0) {
        const values = admins.map((a) => [
          a.id, 'high_urgency_report', 'High-priority lost item',
          `${String(title).trim()} — ${last_location} (${reporter_role})`, `/admin`,
        ]);
        await conn.query(`INSERT INTO notifications (user_id, type, title, body, link) VALUES ?`, [values]);
      }
    }

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT i.*, u.username AS reporter
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE i.id = ?`, [itemId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error('[items] report lost failed:', err);
    res.status(500).json({ error: 'Failed to report lost item' });
  } finally {
    conn.release();
  }
});

router.get('/lost', async (req, res) => {
  const { category, urgency, limit } = req.query;
  const where = ["i.status = 'lost'"];
  const params = [];

  if (category) { where.push('i.category = ?'); params.push(category); }
  if (urgency)  { where.push('i.urgency = ?');  params.push(urgency); }
  params.push(Math.min(Number(limit) || 50, 100));

  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.title, i.quantity, i.brand, i.color, i.category, i.category_other,
              i.description, i.image_url, i.last_location, i.lost_at, i.urgency,
              i.reporter_role, i.contact_pref, i.status, i.created_at,
              u.username AS reporter
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY i.created_at DESC
        LIMIT ?`, params
    );
    res.json(rows);
  } catch (err) {
    console.error('[items] list lost failed:', err);
    res.status(500).json({ error: 'Failed to list lost items' });
  }
});

/* Live lookup for Report Found — narrow match, trimmed output */
router.get('/lost/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const like = `%${q}%`;
  const prefix = `${q}%`;
  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.user_id, i.title, i.quantity, i.category, i.color, i.last_location, i.lost_at,
              i.description, i.image_url, i.urgency,
              u.username AS reporter
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE i.status = 'lost'
          AND (i.title LIKE ? OR i.description LIKE ?)
        ORDER BY
          CASE WHEN i.title LIKE ? THEN 0 ELSE 1 END,
          i.created_at DESC
        LIMIT 5`,
      [like, like, prefix]
    );
    res.json(rows);
  } catch (err) {
    console.error('[items] lost search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});


/* ================================================================ */
/* FOUND ITEMS                                                      */
/* ================================================================ */

router.post('/found', requireAuth, upload.array('photos', 3), async (req, res) => {
  const {
    title, category, category_other,
    color_pill, description, photo_blur,
    last_location, lost_at,
    custody, dropoff_location, tag_number,
    secret_detail, anonymous, linked_lost_id,
  } = req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!category || !String(category).trim()) {
    return res.status(400).json({ error: 'category is required' });
  }
  if (!secret_detail || !String(secret_detail).trim()) {
    return res.status(400).json({ error: 'secret_detail is required' });
  }

  const validCustody = ['office', 'self'];
  const custodyValue = custody || 'self';
  if (!validCustody.includes(custodyValue)) {
    return res.status(400).json({ error: 'invalid custody' });
  }
  if (custodyValue === 'office' && (!dropoff_location || !String(dropoff_location).trim())) {
    return res.status(400).json({ error: 'dropoff_location is required when custody = office' });
  }

  const lastLocationValue = last_location ? String(last_location).trim() : 'Not specified';
  let foundAtValue = new Date();
  if (lost_at) {
    const parsed = new Date(lost_at);
    if (!isNaN(parsed.getTime())) foundAtValue = parsed;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let linkedLostId = null;

    if (linked_lost_id) {
      const n = Number(linked_lost_id);
      if (Number.isInteger(n) && n > 0) {
        const [check] = await conn.query(
          `SELECT id FROM items WHERE id = ? AND status = 'lost'`, [n]
        );
        if (check.length > 0) linkedLostId = n;
      }
    }

    if (!linkedLostId) {
      const [auto] = await conn.query(
        `SELECT id, user_id FROM items
          WHERE status = 'lost'
            AND LOWER(title) = LOWER(?)
          ORDER BY created_at ASC
          LIMIT 1`,
        [String(title).trim()]
      );
      if (auto.length > 0) {
        if (Number(auto[0].user_id) === Number(req.user.id)) {
          await conn.rollback();
          return res.status(400).json({
            error: 'You cannot report the same item as found if you reported it as lost. Ask a different person to report the found item, or contact the admin office.',
          });
        }
        linkedLostId = auto[0].id;
      }
    }

    const [result] = await conn.query(
      `INSERT INTO items
        (user_id, title, color, category, category_other,
         description, last_location, lost_at, urgency,
         reporter_role, contact_pref, status,
         color_pill, photo_blur, custody, dropoff_location, tag_number, secret_detail, anonymous,
         linked_lost_id)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'normal', 'student', 'email', 'found',
               ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        String(title).trim(),
        String(category).trim(),
        category === 'other' ? String(category_other || '').trim() : null,
        String(description || '').trim() || null,
        lastLocationValue,
        foundAtValue,
        color_pill || null,
        photo_blur === 'true' || photo_blur === true ? 1 : 0,
        custodyValue,
        custodyValue === 'office' ? String(dropoff_location).trim() : null,
        tag_number ? String(tag_number).trim() : null,
        String(secret_detail).trim(),
        anonymous === 'true' || anonymous === true ? 1 : 0,
        linkedLostId,
      ]
    );

    const itemId = result.insertId;

    if (req.files && req.files.length > 0) {
      const photoRows = req.files.map((f) => [itemId, `/uploads/${f.filename}`]);
      await conn.query(`INSERT INTO item_photos (item_id, url) VALUES ?`, [photoRows]);
      await conn.query(`UPDATE items SET image_url = ? WHERE id = ?`, [photoRows[0][1], itemId]);
    }

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'found_report_received', ?, ?, ?)`,
      [req.user.id, 'Found item report received',
       `Your report for "${String(title).trim()}" has been saved.`, `/items/${itemId}`]
    );

    if (linkedLostId) {
      const [lostOwner] = await conn.query(
        `SELECT user_id FROM items WHERE id = ?`, [linkedLostId]
      );
      if (lostOwner.length > 0 && lostOwner[0].user_id !== req.user.id) {
        await conn.query(
          `INSERT INTO notifications (user_id, type, title, body, link)
           VALUES (?, 'possible_match_found', ?, ?, ?)`,
          [
            lostOwner[0].user_id,
            'Possible match found for your lost item',
            `Someone found an item that matches your lost report — "${String(title).trim()}".`,
            `/items/${itemId}`,
          ]
        );
      }
    }

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT i.*, u.username AS reporter
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE i.id = ?`, [itemId]
    );
    const [photos] = await conn.query(
      `SELECT id, url FROM item_photos WHERE item_id = ?`, [itemId]
    );

    res.status(201).json({ ...rows[0], photos });
  } catch (err) {
    await conn.rollback();
    console.error('[items] report found failed:', err);
    res.status(500).json({ error: 'Failed to report found item' });
  } finally {
    conn.release();
  }
});

router.get('/found', async (req, res) => {
  const { category, limit } = req.query;
  const where = ["i.status = 'found'"];
  const params = [];

  if (category) { where.push('i.category = ?'); params.push(category); }
  params.push(Math.min(Number(limit) || 50, 100));

  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.title, i.category, i.category_other, i.color_pill,
              i.description, i.image_url, i.last_location, i.lost_at, i.custody,
              i.anonymous, i.status, i.created_at, i.linked_lost_id,
              u.username AS reporter
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY i.created_at DESC
        LIMIT ?`, params
    );
    res.json(rows);
  } catch (err) {
    console.error('[items] list found failed:', err);
    res.status(500).json({ error: 'Failed to list found items' });
  }
});


/* ================================================================ */
/* MATCHES                                                          */
/* ================================================================ */

router.get('/:id/matches', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  try {
    const [baseRows] = await pool.query(
      `SELECT category, title FROM items WHERE id = ?`, [id]
    );
    if (!baseRows[0]) return res.status(404).json({ error: 'Item not found' });

    const { category, title } = baseRows[0];
    const firstWord = String(title || '').split(' ')[0];
    const like = `%${firstWord}%`;

    const [matches] = await pool.query(
      `SELECT i.id, i.title, i.category, i.last_location, i.lost_at,
              i.description, i.image_url, i.created_at,
              u.username AS reporter
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE i.status = 'lost'
          AND i.category = ?
          AND (i.title LIKE ? OR i.description LIKE ?)
        ORDER BY i.created_at DESC
        LIMIT 3`,
      [category, like, like]
    );

    res.json(matches);
  } catch (err) {
    console.error('[items] match lookup failed:', err);
    res.status(500).json({ error: 'Failed to find matches' });
  }
});


/* ================================================================ */
/* PUBLIC SEARCH — powers the /search page                          */
/* MUST be declared before /:id                                     */
/* ================================================================ */

router.get('/search', async (req, res) => {
  const {
    q = '',
    type = 'found',
    category,
    location,
    date = 'any',
    status = 'active',
    sort = 'newest',
    limit = '12',
    offset = '0',
  } = req.query;

  const where = [];
  const params = [];
  const typeValue = type === 'lost' ? 'lost' : 'found';

  if (typeValue === 'lost') {
    where.push("i.status = 'lost'");
    where.push('NOT EXISTS (SELECT 1 FROM items f WHERE f.linked_lost_id = i.id)');
  } else {
    if (status === 'all') {
      where.push("i.status IN ('found', 'claimed')");
    } else {
      where.push("i.status = 'found'");
    }
  }

  const qTrim = String(q).trim();
  if (qTrim.length > 0) {
    const like = `%${qTrim}%`;
    where.push('(i.title LIKE ? OR i.description LIKE ? OR i.brand LIKE ? OR i.color LIKE ? OR i.color_pill LIKE ?)');
    params.push(like, like, like, like, like);
  }

  if (category && category !== 'all') {
    where.push('i.category = ?');
    params.push(category);
  }

  if (location && location !== 'all') {
    where.push('i.last_location LIKE ?');
    params.push(`%${location}%`);
  }

  if (date === 'today') where.push('DATE(i.created_at) = CURDATE()');
  if (date === '3d')    where.push('i.created_at >= DATE_SUB(NOW(), INTERVAL 3 DAY)');
  if (date === 'week')  where.push('i.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
  if (date === 'month') where.push('i.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');

  const orderBy = sort === 'oldest' ? 'i.created_at ASC' : 'i.created_at DESC';
  const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const offsetNum = Math.max(Number(offset) || 0, 0);

  try {
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         i.id, i.user_id, i.title, i.quantity, i.category, i.category_other, i.color, i.color_pill,
         i.brand, i.description, i.image_url, i.last_location,
         i.lost_at, i.created_at, i.urgency, i.status, i.photo_blur,
         (SELECT c.status FROM claims c
            WHERE c.item_id = i.id
            ORDER BY c.claim_date DESC LIMIT 1) AS claim_status
       FROM items i
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offsetNum]
    );

    const cleaned = rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      quantity: r.quantity,
      category: r.category,
      category_other: r.category_other,
      color: r.color,
      color_pill: r.color_pill,
      brand: r.brand,
      description: r.description,
      image_url: r.image_url,
      last_location: r.last_location,
      lost_at: r.lost_at,
      created_at: r.created_at,
      urgency: r.urgency,
      status: r.status,
      photo_blur: !!r.photo_blur,
      claim_status: r.claim_status,
    }));

    res.json({ items: cleaned, count: cleaned.length });
  } catch (err) {
    console.error('[items] search failed:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});


/* ================================================================ */
/* SINGLE ITEM — catch-all, MUST come LAST                          */
/* ================================================================ */

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT i.id, i.user_id, i.title, i.quantity, i.brand, i.color, i.color_pill, i.category, i.category_other,
              i.description, i.image_url, i.last_location, i.lost_at, i.urgency,
              i.reporter_role, i.contact_pref, i.status, i.created_at,
              i.custody, i.dropoff_location, i.tag_number, i.anonymous, i.photo_blur,
              i.linked_lost_id,
              u.username AS reporter, u.email AS reporter_email
         FROM items i JOIN users u ON u.id = i.user_id
        WHERE i.id = ?`, [id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Item not found' });

    const [photos] = await pool.query(
      `SELECT id, url FROM item_photos WHERE item_id = ?`, [id]
    );

    res.json({ ...rows[0], photos });
  } catch (err) {
    console.error('[items] get item failed:', err);
    res.status(500).json({ error: 'Failed to load item' });
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