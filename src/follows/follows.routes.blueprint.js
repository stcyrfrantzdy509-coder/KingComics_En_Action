// KCA Module 34 — Member follow routes blueprint.
// requireAuth must set req.user.id; optionalAuth may set it for logged-in visitors.

export function createFollowRouter({ express, pool, requireAuth, optionalAuth }) {
  const router = express.Router();

  router.post("/:userId", requireAuth, async (req, res, next) => {
    try {
      const followedId = Number.parseInt(req.params.userId, 10);
      const followerId = Number(req.user.id);
      if (!Number.isSafeInteger(followedId) || followedId < 1) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }
      if (followedId === followerId) {
        return res.status(400).json({ error: "CANNOT_FOLLOW_SELF" });
      }
      const target = await pool.query(`SELECT id FROM users WHERE id = $1`, [followedId]);
      if (!target.rowCount) return res.status(404).json({ error: "USER_NOT_FOUND" });

      const result = await pool.query(
        `INSERT INTO user_follows (follower_user_id, followed_user_id)
         VALUES ($1, $2)
         ON CONFLICT (follower_user_id, followed_user_id) DO NOTHING
         RETURNING created_at`,
        [followerId, followedId],
      );
      res.status(result.rowCount ? 201 : 200).json({
        following: true,
        created: result.rowCount === 1,
        followedUserId: followedId,
      });
    } catch (err) { next(err); }
  });

  router.delete("/:userId", requireAuth, async (req, res, next) => {
    try {
      const followedId = Number.parseInt(req.params.userId, 10);
      if (!Number.isSafeInteger(followedId) || followedId < 1) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }
      await pool.query(
        `DELETE FROM user_follows
         WHERE follower_user_id = $1 AND followed_user_id = $2`,
        [req.user.id, followedId],
      );
      res.json({ following: false, followedUserId: followedId });
    } catch (err) { next(err); }
  });

  router.get("/:userId/followers", optionalAuth, async (req, res, next) => {
    try {
      const targetId = Number.parseInt(req.params.userId, 10);
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
      const before = req.query.before ? Number.parseInt(req.query.before, 10) : null;
      if (!Number.isSafeInteger(targetId) || targetId < 1 ||
          (before !== null && (!Number.isSafeInteger(before) || before < 1))) {
        return res.status(400).json({ error: "INVALID_PARAMETER" });
      }
      const result = await pool.query(
        `SELECT u.id, u.username, u.display_name, f.created_at, f.follower_user_id AS cursor_id
         FROM user_follows f
         JOIN users u ON u.id = f.follower_user_id
         WHERE f.followed_user_id = $1
           AND ($2::bigint IS NULL OR f.follower_user_id < $2)
         ORDER BY f.follower_user_id DESC
         LIMIT $3`,
        [targetId, before, limit],
      );
      res.json({
        items: result.rows.map(r => ({
          id: r.id, username: r.username, displayName: r.display_name, followedAt: r.created_at,
        })),
        nextBefore: result.rows.length === limit ? result.rows[result.rows.length - 1].cursor_id : null,
      });
    } catch (err) { next(err); }
  });

  router.get("/:userId/following", optionalAuth, async (req, res, next) => {
    try {
      const targetId = Number.parseInt(req.params.userId, 10);
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
      const before = req.query.before ? Number.parseInt(req.query.before, 10) : null;
      if (!Number.isSafeInteger(targetId) || targetId < 1 ||
          (before !== null && (!Number.isSafeInteger(before) || before < 1))) {
        return res.status(400).json({ error: "INVALID_PARAMETER" });
      }
      const result = await pool.query(
        `SELECT u.id, u.username, u.display_name, f.created_at, f.followed_user_id AS cursor_id
         FROM user_follows f
         JOIN users u ON u.id = f.followed_user_id
         WHERE f.follower_user_id = $1
           AND ($2::bigint IS NULL OR f.followed_user_id < $2)
         ORDER BY f.followed_user_id DESC
         LIMIT $3`,
        [targetId, before, limit],
      );
      res.json({
        items: result.rows.map(r => ({
          id: r.id, username: r.username, displayName: r.display_name, followedAt: r.created_at,
        })),
        nextBefore: result.rows.length === limit ? result.rows[result.rows.length - 1].cursor_id : null,
      });
    } catch (err) { next(err); }
  });

  router.get("/:userId/status", optionalAuth, async (req, res, next) => {
    try {
      const targetId = Number.parseInt(req.params.userId, 10);
      if (!Number.isSafeInteger(targetId) || targetId < 1) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }
      const counts = await pool.query(
        `SELECT
           (SELECT COUNT(*)::int FROM user_follows WHERE followed_user_id = $1) AS followers,
           (SELECT COUNT(*)::int FROM user_follows WHERE follower_user_id = $1) AS following`,
        [targetId],
      );
      let isFollowing = false;
      if (req.user?.id != null) {
        const status = await pool.query(
          `SELECT 1 FROM user_follows WHERE follower_user_id = $1 AND followed_user_id = $2`,
          [req.user.id, targetId],
        );
        isFollowing = status.rowCount > 0;
      }
      res.json({ followers: counts.rows[0].followers, following: counts.rows[0].following, isFollowing });
    } catch (err) { next(err); }
  });

  return router;
}
