// KCA Module 31 — Express route blueprint
// Assumptions: `requireAuth` sets req.user.id; `pool` is a configured pg Pool.
// Mount after schema review and integration with the app's actual auth module.

export function createNotificationRouter({ express, pool, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
      const cursor = req.query.before ? Number.parseInt(req.query.before, 10) : null;
      if (cursor !== null && (!Number.isSafeInteger(cursor) || cursor < 1)) {
        return res.status(400).json({ error: "INVALID_CURSOR" });
      }

      const result = await pool.query(
        `SELECT id, type, entity_type, entity_id, title, body, payload,
                actor_user_id, created_at, read_at
         FROM notifications
         WHERE recipient_user_id = $1
           AND ($2::bigint IS NULL OR id < $2)
         ORDER BY id DESC
         LIMIT $3`,
        [req.user.id, cursor, limit],
      );
      const unread = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM notifications
         WHERE recipient_user_id = $1 AND read_at IS NULL`,
        [req.user.id],
      );
      res.json({
        items: result.rows.map((r) => ({
          id: r.id, type: r.type, entityType: r.entity_type, entityId: r.entity_id,
          title: r.title, body: r.body, payload: r.payload,
          actor: r.actor_user_id == null ? null : { id: r.actor_user_id },
          createdAt: r.created_at, readAt: r.read_at,
        })),
        unreadCount: unread.rows[0].count,
        nextBefore: result.rows.length === limit ? result.rows[result.rows.length - 1].id : null,
      });
    } catch (err) { next(err); }
  });

  router.post("/:id/read", requireAuth, async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "INVALID_ID" });
      const result = await pool.query(
        `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
         WHERE id = $1 AND recipient_user_id = $2
         RETURNING id, read_at`,
        [id, req.user.id],
      );
      if (!result.rowCount) return res.status(404).json({ error: "NOTIFICATION_NOT_FOUND" });
      res.json({ id: result.rows[0].id, readAt: result.rows[0].read_at });
    } catch (err) { next(err); }
  });

  router.post("/read-all", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `UPDATE notifications SET read_at = NOW()
         WHERE recipient_user_id = $1 AND read_at IS NULL`,
        [req.user.id],
      );
      res.json({ updated: result.rowCount });
    } catch (err) { next(err); }
  });

  return router;
}
