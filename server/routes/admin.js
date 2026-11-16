import { requireAuth, requireAdmin } from '../auth.js';
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

/* ================================================================ */
/* GET /api/admin/stats                                             */

router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      [userCount],
      [itemStats],
      [claimStats],
      [topReporters],
      [approvedToday],
      [rejectedToday],
      [returnedThisMonth],
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM users`),
      pool.query(`
        SELECT COUNT(*) AS total,
               SUM(status = 'lost')    AS lost,
               SUM(status = 'found')   AS found,
               SUM(status = 'claimed') AS claimed
        FROM items WHERE archived_at IS NULL`),
      pool.query(`
        SELECT COUNT(*) AS total,
               SUM(status = 'pending')  AS pending,
               SUM(status = 'approved') AS approved,
               SUM(status = 'rejected') AS rejected
        FROM claims`),
      pool.query(`
        SELECT u.username, COUNT(i.id) AS item_count
        FROM users u LEFT JOIN items i ON i.user_id = u.id
        GROUP BY u.id, u.username
        ORDER BY item_count DESC LIMIT 5`),
      pool.query(`
        SELECT COUNT(*) AS total FROM claims
        WHERE status = 'approved' AND DATE(claim_date) = CURDATE()`),
      pool.query(`
        SELECT COUNT(*) AS total FROM claims
        WHERE status = 'rejected' AND DATE(claim_date) = CURDATE()`),
      pool.query(`
        SELECT COUNT(*) AS total FROM items
        WHERE returned_at IS NOT NULL
          AND MONTH(returned_at) = MONTH(CURDATE())
          AND YEAR(returned_at) = YEAR(CURDATE())`),
    ]);

    res.json({
      stats: {
        users: userCount[0].total,
        items: {
          total:   Number(itemStats[0].total)   || 0,
          lost:    Number(itemStats[0].lost)    || 0,
          found:   Number(itemStats[0].found)   || 0,
          claimed: Number(itemStats[0].claimed) || 0,
        },
        claims: {
          total:    Number(claimStats[0].total)    || 0,
          pending:  Number(claimStats[0].pending)  || 0,
          approved: Number(claimStats[0].approved) || 0,
          rejected: Number(claimStats[0].rejected) || 0,
        },
        approvedToday:     Number(approvedToday[0].total)     || 0,
        rejectedToday:     Number(rejectedToday[0].total)     || 0,
        returnedThisMonth: Number(returnedThisMonth[0].total) || 0,
      },
      topReporters,
    });
  } catch (err) {
    console.error('[admin] stats query failed:', err);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

/* ================================================================ */
/* GET /api/admin/claims/pending                                    */

router.get('/claims/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        c.id, c.status, c.claim_date, c.proof, c.phone, c.lost_context,
        c.supporting_image_url,
        i.id      AS item_id, i.title AS item, i.category AS item_category,
        i.image_url AS item_image_url, i.storage_location,
        i.private_notes, i.last_location,
        u.id      AS claimant_id,
        u.username AS claimant,
        u.student_id AS claimant_student_id,
        u.email    AS claimant_email,
        DATEDIFF(CURDATE(), DATE(i.created_at)) AS days_in_custody,
        (SELECT COUNT(*) FROM claims c2
          WHERE c2.item_id = i.id AND c2.status = 'pending') AS competing_claims
      FROM claims c
      JOIN items i ON i.id = c.item_id
      JOIN users u ON u.id = c.claimant_id
      WHERE c.status = 'pending'
      ORDER BY c.claim_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[admin] pending claims query failed:', err);
    res.status(500).json({ error: 'Failed to load pending claims' });
  }
});

/* ================================================================ */
/* GET /api/admin/claims/by-item/:itemId                            */

router.get('/claims/by-item/:itemId', requireAuth, requireAdmin, async (req, res) => {
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  try {
    const [claims] = await pool.query(`
      SELECT
        c.id, c.status, c.claim_date, c.proof, c.phone, c.lost_context,
        c.supporting_image_url, c.reject_reason,
        u.id AS claimant_id, u.username AS claimant,
        u.student_id AS claimant_student_id, u.email AS claimant_email
      FROM claims c
      JOIN users u ON u.id = c.claimant_id
      WHERE c.item_id = ?
      ORDER BY
        CASE WHEN c.status = 'pending'  THEN 1
             WHEN c.status = 'approved' THEN 2
             ELSE 3 END,
        c.claim_date DESC
    `, [itemId]);
    res.json(claims);
  } catch (err) {
    console.error('[admin] by-item claims failed:', err);
    res.status(500).json({ error: 'Failed to load claims for item' });
  }
});

/* ================================================================ */
/* POST /api/admin/claims/:id/approve                               */

router.post('/claims/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    return res.status(400).json({ error: 'Invalid claim id' });
  }
  const { pickup_instructions } = req.body || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, item_id FROM claims WHERE id = ? AND status = 'pending'`, [claimId]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pending claim not found' });
    }
    const { item_id: itemId } = rows[0];

    await conn.query(`UPDATE claims SET status = 'approved' WHERE id = ?`, [claimId]);

    await conn.query(
      `UPDATE claims
         SET status = 'rejected',
             reject_reason = 'Another claimant was approved for this item.'
       WHERE item_id = ? AND id != ? AND status = 'pending'`,
      [itemId, claimId]
    );

    await conn.query(
      `UPDATE items
         SET status = 'claimed',
             pickup_instructions = COALESCE(?, pickup_instructions)
       WHERE id = ?`,
      [pickup_instructions ? String(pickup_instructions).trim() : null, itemId]
    );

    /* Close the linked lost report so it stops showing as "Lost". */
    const [linked] = await conn.query(
      `SELECT linked_lost_id FROM items WHERE id = ?`, [itemId]
    );
    if (linked[0]?.linked_lost_id) {
      await conn.query(
        `UPDATE items
            SET status = 'claimed'
          WHERE id = ?
            AND status = 'lost'`,
        [linked[0].linked_lost_id]
      );
    }

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       SELECT claimant_id, 'claim_approved',
              'Your claim was approved',
              CONCAT('Your claim on "', i.title, '" was approved. ', COALESCE(?, 'Pickup instructions will follow.')),
              '/claims'
         FROM claims c JOIN items i ON i.id = c.item_id
        WHERE c.id = ?`,
      [pickup_instructions || null, claimId]
    );

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       SELECT claimant_id, 'claim_rejected',
              'Your claim was not approved',
              'Another claimant was approved for this item.',
              '/claims'
         FROM claims
        WHERE item_id = ? AND id != ? AND status = 'rejected'
          AND reject_reason = 'Another claimant was approved for this item.'`,
      [itemId, claimId]
    );

    await conn.commit();
    res.json({ ok: true, id: claimId, status: 'approved', item_id: itemId });
  } catch (err) {
    await conn.rollback();
    console.error('[admin] approve failed:', err);
    res.status(500).json({ error: 'Failed to approve claim' });
  } finally {
    conn.release();
  }
});

/* ================================================================ */
/* POST /api/admin/claims/:id/reject                                */

router.post('/claims/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const claimId = Number(req.params.id);
  if (!Number.isInteger(claimId) || claimId <= 0) {
    return res.status(400).json({ error: 'Invalid claim id' });
  }
  const { reason } = req.body || {};

  try {
    const [result] = await pool.query(
      `UPDATE claims
         SET status = 'rejected', reject_reason = COALESCE(?, reject_reason)
       WHERE id = ? AND status = 'pending'`,
      [reason ? String(reason).trim() : null, claimId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Pending claim not found' });
    }
    res.json({ ok: true, id: claimId, status: 'rejected' });
  } catch (err) {
    console.error('[admin] reject failed:', err);
    res.status(500).json({ error: 'Failed to reject claim' });
  }
});

/* ================================================================ */
/* POST /api/admin/items/:id/returned                               */

router.post('/items/:id/returned', requireAuth, requireAdmin, async (req, res) => {
  const itemId = Number(req.params.id);
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE items SET returned_at = NOW() WHERE id = ?`, [itemId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ ok: true, id: itemId, returned_at: new Date().toISOString() });
  } catch (err) {
    console.error('[admin] mark returned failed:', err);
    res.status(500).json({ error: 'Failed to mark item as returned' });
  }
});

/* ================================================================ */
/* GET /api/admin/inventory                                         */

router.get('/inventory', requireAuth, requireAdmin, async (req, res) => {
  const { status, category, q, limit } = req.query;
  const where = [
    'archived_at IS NULL',
    "NOT (status = 'lost' AND EXISTS (SELECT 1 FROM items f WHERE f.linked_lost_id = items.id))",
  ];
  const params = [];

  if (status && status !== 'all') {
    if (status === 'returned') {
      where.push('returned_at IS NOT NULL');
    } else if (status === 'unclaimed') {
      where.push("status = 'found' AND returned_at IS NULL");
    } else {
      where.push('status = ?');
      params.push(status);
    }
  }
  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }
  if (q && q.trim().length > 0) {
    const like = `%${q.trim()}%`;
    where.push('(title LIKE ? OR description LIKE ? OR brand LIKE ?)');
    params.push(like, like, like);
  }
  params.push(Math.min(Number(limit) || 100, 200));

  try {
    const [rows] = await pool.query(
      `SELECT
         id, title, category, category_other, color, color_pill, brand,
         image_url, storage_location, last_location, status,
         created_at, returned_at, archived_at,
         DATEDIFF(CURDATE(), DATE(created_at)) AS days_in_custody,
         (SELECT status FROM claims c
            WHERE c.item_id = items.id
            ORDER BY c.claim_date DESC LIMIT 1) AS latest_claim_status
       FROM items
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ?`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[admin] inventory failed:', err);
    res.status(500).json({ error: 'Failed to load inventory' });
  }
});

/* ================================================================ */
/* POST /api/admin/items/quick-log                                  */

router.post('/items/quick-log', requireAuth, requireAdmin, async (req, res) => {
  const {
    title, category, category_other, color,
    description, last_location,
    storage_location, private_notes,
  } = req.body || {};

  if (!title || !String(title).trim()) return res.status(400).json({ error: 'title is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ error: 'category is required' });
  if (!storage_location || !String(storage_location).trim()) {
    return res.status(400).json({ error: 'storage_location is required' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO items
        (user_id, title, color, category, category_other,
         description, last_location, status,
         storage_location, private_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'found', ?, ?, NOW())`,
      [
        req.user.id,
        String(title).trim(),
        color ? String(color).trim() : null,
        String(category).trim(),
        category === 'other' ? String(category_other || '').trim() : null,
        description ? String(description).trim() : null,
        last_location ? String(last_location).trim() : 'Not specified',
        String(storage_location).trim(),
        private_notes ? String(private_notes).trim() : null,
      ]
    );
    res.status(201).json({ ok: true, id: result.insertId });
  } catch (err) {
    console.error('[admin] quick-log failed:', err);
    res.status(500).json({ error: 'Failed to log item' });
  }
});

/* ================================================================ */
/* GET /api/admin/lost-reports                                      */

router.get('/lost-reports', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.title, i.category, i.color, i.last_location,
             i.created_at, u.username AS reporter,
             DATEDIFF(CURDATE(), DATE(i.created_at)) AS days_open
        FROM items i JOIN users u ON u.id = i.user_id
       WHERE i.status = 'lost' AND i.archived_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM items f WHERE f.linked_lost_id = i.id)
       ORDER BY i.created_at DESC
       LIMIT 100
    `);
    res.json(rows);
  } catch (err) {
    console.error('[admin] lost-reports failed:', err);
    res.status(500).json({ error: 'Failed to load lost reports' });
  }
});

/* ================================================================ */
/* POST /api/admin/link-manual                                      */

router.post('/link-manual', requireAuth, requireAdmin, async (req, res) => {
  const { lost_id, found_id } = req.body || {};
  const lostId  = Number(lost_id);
  const foundId = Number(found_id);
  if (!Number.isInteger(lostId)  || lostId  <= 0) return res.status(400).json({ error: 'Invalid lost_id' });
  if (!Number.isInteger(foundId) || foundId <= 0) return res.status(400).json({ error: 'Invalid found_id' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [lostRows] = await conn.query(
      `SELECT id, user_id, title FROM items WHERE id = ?`, [lostId]
    );
    const [foundRows] = await conn.query(
      `SELECT id, title FROM items WHERE id = ?`, [foundId]
    );
    if (lostRows.length === 0)  { await conn.rollback(); return res.status(404).json({ error: 'Lost report not found or not open' }); }
    if (foundRows.length === 0) { await conn.rollback(); return res.status(404).json({ error: 'Found item not found or not unclaimed' }); }

    await conn.query(`UPDATE items SET linked_lost_id = ? WHERE id = ?`, [lostId, foundId]);
    await conn.query(`UPDATE items SET status = 'claimed' WHERE id = ?`, [foundId]);
    await conn.query(`UPDATE items SET status = 'claimed' WHERE id = ? AND status = 'lost'`, [lostId]);

    await conn.query(
      `INSERT INTO notifications (user_id, type, title, body, link)
       VALUES (?, 'possible_match_found',
               'Staff matched an item to your lost report',
               ?,
               ?)`,
      [
        lostRows[0].user_id,
        `Staff linked a found item ("${foundRows[0].title}") to your lost report "${lostRows[0].title}". Visit the office to verify.`,
        `/items/${foundId}`,
      ]
    );

    await conn.commit();
    res.json({ ok: true, lost_id: lostId, found_id: foundId });
  } catch (err) {
    await conn.rollback();
    console.error('[admin] link-manual failed:', err);
    res.status(500).json({ error: 'Failed to link items' });
  } finally {
    conn.release();
  }
});

/* ================================================================ */
/* GET /api/admin/aging                                             */

router.get('/aging', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.id, i.title, i.category, i.image_url, i.storage_location,
             i.created_at, i.status,
             u.username AS reporter,
             DATEDIFF(CURDATE(), DATE(i.created_at)) AS days_in_custody
        FROM items i LEFT JOIN users u ON u.id = i.user_id
       WHERE i.status = 'found'
         AND i.returned_at IS NULL
         AND i.archived_at IS NULL
         AND DATEDIFF(CURDATE(), DATE(i.created_at)) >= 30
       ORDER BY i.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[admin] aging failed:', err);
    res.status(500).json({ error: 'Failed to load aging items' });
  }
});

/* ================================================================ */
/* POST /api/admin/items/bulk-archive                               */

router.post('/items/bulk-archive', requireAuth, requireAdmin, async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array required' });
  }
  const clean = ids.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0) return res.status(400).json({ error: 'No valid ids' });

  try {
    const [result] = await pool.query(
      `UPDATE items SET archived_at = NOW() WHERE id IN (?)`, [clean]
    );
    res.json({ ok: true, archived: result.affectedRows, ids: clean });
  } catch (err) {
    console.error('[admin] bulk archive failed:', err);
    res.status(500).json({ error: 'Failed to archive items' });
  }
});

/* ================================================================ */
/* PATCH /api/admin/items/:id — edit item fields                    */

router.patch('/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }

  const allowed = [
    'title', 'brand', 'color', 'category', 'category_other',
    'description', 'storage_location', 'private_notes', 'last_location',
    'urgency', 'status',
  ];

  const updates = [];
  const params = [];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = ?`);
      const v = req.body[key];
      params.push(v === '' ? null : v);
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  params.push(id);

  try {
    const [result] = await pool.query(
      `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const [rows] = await pool.query(`SELECT * FROM items WHERE id = ?`, [id]);
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('[admin] edit item failed:', err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

/* ================================================================ */
/* DELETE /api/admin/items/:id — permanently delete an item         */
/* Cascades to claims, item_photos via foreign keys                 */

router.delete('/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    /* Fetch the item first to find the image file to clean up */
    const [rows] = await conn.query(
      `SELECT id, title, image_url FROM items WHERE id = ?`, [id]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Item not found' });
    }
    const item = rows[0];

    /* Get all photo file paths for cleanup */
    const [photos] = await conn.query(
      `SELECT url FROM item_photos WHERE item_id = ?`, [id]
    );

    /* Delete the item — cascades to claims, item_photos, notifications */
    await conn.query(`DELETE FROM items WHERE id = ?`, [id]);

    await conn.commit();

    /* Best-effort file cleanup (outside the transaction) */
    const fs = await import('node:fs');
    const path = await import('node:path');
    const uploadsDir = path.resolve('server', 'uploads');

    const filesToRemove = [];
    if (item.image_url) filesToRemove.push(item.image_url);
    for (const p of photos) filesToRemove.push(p.url);

    for (const urlPath of filesToRemove) {
      if (!urlPath) continue;
      const filename = path.basename(urlPath);
      const fullPath = path.join(uploadsDir, filename);
      try {
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch (e) {
        console.warn('[admin] could not remove file:', fullPath, e.message);
      }
    }

    res.json({ ok: true, id, title: item.title });
  } catch (err) {
    await conn.rollback();
    console.error('[admin] delete item failed:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  } finally {
    conn.release();
  }
});

/* ================================================================ */
/* POST /api/admin/items/:id/soft-delete — archive rather than kill */
/* (already exists as bulk-archive, this is the single-item version)*/

router.post('/items/:id/archive', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  try {
    const [result] = await pool.query(
      `UPDATE items SET archived_at = NOW() WHERE id = ?`, [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ ok: true, id });
  } catch (err) {
    console.error('[admin] archive item failed:', err);
    res.status(500).json({ error: 'Failed to archive item' });
  }
});

/* ================================================================ */
/* GET /api/admin/items/:id — full item for edit form              */

router.get('/items/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }
  try {
    const [rows] = await pool.query(`SELECT * FROM items WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin] get item failed:', err);
    res.status(500).json({ error: 'Failed to load item' });
  }
});
/* ================================================================ */
/* POST /api/admin/items/:id/set-status                             */
/* Force-set status and/or returned_at — for admin corrections      */

router.post('/items/:id/set-status', requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item id' });
  }

  const { status, returned } = req.body || {};
  const updates = [];
  const params = [];

  if (status !== undefined) {
    const validStatuses = ['lost', 'found', 'claimed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (returned !== undefined) {
    if (returned === true || returned === 1) {
      updates.push('returned_at = NOW()');
    } else {
      updates.push('returned_at = NULL');
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(id);

  try {
    const [result] = await pool.query(
      `UPDATE items SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const [rows] = await pool.query(
      `SELECT id, title, status, returned_at FROM items WHERE id = ?`, [id]
    );
    res.json({ ok: true, item: rows[0] });
  } catch (err) {
    console.error('[admin] set-status failed:', err);
    res.status(500).json({ error: 'Failed to update item status' });
  }
});
/* ================================================================ */
/* GET /api/admin/claims/log                                        */
/* Full claims history — all statuses, searchable, filterable       */
/* ================================================================ */
router.get('/claims/log', requireAuth, requireAdmin, async (req, res) => {
  const { status, q, limit } = req.query;
  const where = [];
  const params = [];

  if (status && status !== 'all') {
    where.push('c.status = ?');
    params.push(status);
  }

  if (q && q.trim().length > 0) {
    const like = `%${q.trim()}%`;
    where.push('(u.username LIKE ? OR u.student_id LIKE ? OR u.email LIKE ? OR i.title LIKE ?)');
    params.push(like, like, like, like);
  }

  const limitNum = Math.min(Number(limit) || 100, 300);
  params.push(limitNum);

  try {
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         c.id, c.status, c.claim_date, c.proof, c.phone, c.lost_context,
         c.supporting_image_url, c.reject_reason,
         u.id AS claimant_id, u.username AS claimant,
         u.full_name AS claimant_full_name,
         u.student_id AS claimant_student_id,
         u.email AS claimant_email,
         i.id AS item_id, i.title AS item_title,
         i.image_url AS item_image_url,
         i.category AS item_category,
         i.status AS item_status,
         i.storage_location AS item_storage,
         i.returned_at AS item_returned_at,
         (SELECT COUNT(*) FROM claims c2
           WHERE c2.claimant_id = u.id) AS claimant_total_claims,
         (SELECT COUNT(*) FROM claims c2
           WHERE c2.claimant_id = u.id AND c2.status = 'approved') AS claimant_approved_claims,
         (SELECT COUNT(*) FROM claims c2
           WHERE c2.claimant_id = u.id AND c2.status = 'rejected') AS claimant_rejected_claims
       FROM claims c
       JOIN users u ON u.id = c.claimant_id
       JOIN items i ON i.id = c.item_id
       ${whereSql}
       ORDER BY c.claim_date DESC
       LIMIT ?`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('[admin] claims log failed:', err);
    res.status(500).json({ error: 'Failed to load claims log' });
  }
});

/* ================================================================ */
/* GET /api/admin/claims/by-claimant/:userId                        */
/* All claims by a specific user — useful for fraud investigation   */
/* ================================================================ */
router.get('/claims/by-claimant/:userId', requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Invalid user id' });
  }
  try {
    const [userRows] = await pool.query(
      `SELECT id, username, full_name, student_id, email, role, created_at
         FROM users WHERE id = ?`,
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [claims] = await pool.query(
      `SELECT
         c.id, c.status, c.claim_date, c.proof, c.reject_reason,
         c.phone, c.lost_context, c.supporting_image_url,
         i.id AS item_id, i.title AS item_title,
         i.image_url AS item_image_url, i.category AS item_category,
         i.storage_location AS item_storage, i.returned_at AS item_returned_at
       FROM claims c
       JOIN items i ON i.id = c.item_id
       WHERE c.claimant_id = ?
       ORDER BY c.claim_date DESC`,
      [userId]
    );

    res.json({ user: userRows[0], claims });
  } catch (err) {
    console.error('[admin] claims by claimant failed:', err);
    res.status(500).json({ error: 'Failed to load claimant history' });
  }
});
export default router;