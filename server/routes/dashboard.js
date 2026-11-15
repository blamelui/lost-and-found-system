import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [
      [userCount],
      [itemStats],
      [claimStats],
      [recentItems],
      [recentClaims],
      [topReporters],
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM users`),
      pool.query(`
        SELECT COUNT(*) AS total,
               SUM(status = 'lost')    AS lost,
               SUM(status = 'found')   AS found,
               SUM(status = 'claimed') AS claimed
        FROM items`),
      pool.query(`
        SELECT COUNT(*) AS total,
               SUM(status = 'pending')  AS pending,
               SUM(status = 'approved') AS approved,
               SUM(status = 'rejected') AS rejected
        FROM claims`),
      pool.query(`
        SELECT
          i.id, i.title, i.status, i.created_at,
          i.urgency, i.last_location, i.lost_at, i.image_url, i.linked_lost_id,
          u.username AS reporter,
          (SELECT c.status FROM claims c
             WHERE c.item_id = i.id
             ORDER BY c.claim_date DESC LIMIT 1) AS claim_status,
          (SELECT (c.proof IS NOT NULL AND c.proof <> '')
             FROM claims c
             WHERE c.item_id = i.id
             ORDER BY c.claim_date DESC LIMIT 1) AS claim_requires_proof,
          (SELECT COUNT(*) FROM items f
             WHERE f.linked_lost_id = i.id AND f.status = 'found') AS resolved_by_found_count
        FROM items i
        JOIN users u ON u.id = i.user_id
        ORDER BY i.created_at DESC
        LIMIT 20`),
      pool.query(`
        SELECT c.id, c.status, c.claim_date, u.username AS claimant, i.title AS item_title
        FROM claims c
        JOIN users u ON u.id = c.claimant_id
        JOIN items i ON i.id = c.item_id
        ORDER BY c.claim_date DESC LIMIT 5`),
      pool.query(`
        SELECT u.username, COUNT(i.id) AS item_count
        FROM users u LEFT JOIN items i ON i.user_id = u.id
        GROUP BY u.id, u.username
        ORDER BY item_count DESC LIMIT 3`),
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
      },
      recentItems,
      recentClaims,
      topReporters,
    });
  } catch (err) {
    console.error('[dashboard] query failed:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;