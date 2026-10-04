// KCA Module 35 — Personalized feed route blueprint.
// Assumptions: `requireAuth` sets req.user.id; posts and communities schema must be aligned.
// This sample uses the known posts/user_follows relationship concept; verify all columns.

export function createFeedRouter({ express, pool, requireAuth }) {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 30);
      const before = req.query.before ? Number.parseInt(req.query.before, 10) : null;
      const sort = req.query.sort === "popular" ? "popular" : "recent";
      if (before !== null && (!Number.isSafeInteger(before) || before < 1)) {
        return res.status(400).json({ error: "INVALID_CURSOR" });
      }

      // Only published/public posts are eligible. Verify visibility/status columns against final schema.
      const result = await pool.query(
        `SELECT p.id, p.user_id, p.body, p.created_at,
                u.username, u.display_name,
                COALESCE(stats.comment_count, 0)::int AS comment_count,
                COALESCE(stats.like_count, 0)::int AS like_count,
                CASE WHEN f.followed_user_id IS NOT NULL THEN TRUE ELSE FALSE END AS from_followed_member
         FROM posts p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN user_follows f
           ON f.follower_user_id = $1 AND f.followed_user_id = p.user_id
         LEFT JOIN LATERAL (
           SELECT COUNT(*) FILTER (WHERE c.status = 'published') AS comment_count,
                  0::bigint AS like_count
           FROM comments c
           WHERE c.post_id = p.id
         ) stats ON TRUE
         WHERE p.status = 'published'
           AND p.visibility = 'public'
           AND ($2::bigint IS NULL OR p.id < $2)
         ORDER BY
           CASE WHEN $3 = 'popular' THEN COALESCE(stats.comment_count, 0) END DESC NULLS LAST,
           p.created_at DESC, p.id DESC
         LIMIT $4`,
        [req.user.id, before, sort, limit],
      );

      res.json({
        items: result.rows.map((r) => ({
          id: r.id,
          author: { id: r.user_id, username: r.username, displayName: r.display_name },
          body: r.body,
          createdAt: r.created_at,
          commentCount: r.comment_count,
          likeCount: r.like_count,
          fromFollowedMember: r.from_followed_member,
        })),
        nextBefore: result.rows.length === limit ? result.rows[result.rows.length - 1].id : null,
        sort,
      });
    } catch (err) { next(err); }
  });

  router.get("/preferences", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT sort_mode, show_followed_members, show_communities
         FROM feed_preferences WHERE user_id = $1`,
        [req.user.id],
      );
      const p = result.rows[0] ?? {
        sort_mode: "recent", show_followed_members: true, show_communities: true,
      };
      res.json({
        sort: p.sort_mode,
        showFollowedMembers: p.show_followed_members,
        showCommunities: p.show_communities,
      });
    } catch (err) { next(err); }
  });

  router.patch("/preferences", requireAuth, async (req, res, next) => {
    try {
      const body = req.body ?? {};
      if (body.sort !== undefined && !["recent", "popular"].includes(body.sort)) {
        return res.status(400).json({ error: "INVALID_SORT" });
      }
      for (const key of ["showFollowedMembers", "showCommunities"]) {
        if (body[key] !== undefined && typeof body[key] !== "boolean") {
          return res.status(400).json({ error: "INVALID_PREFERENCE", field: key });
        }
      }
      const current = await pool.query(
        `SELECT sort_mode, show_followed_members, show_communities
         FROM feed_preferences WHERE user_id = $1`,
        [req.user.id],
      );
      const old = current.rows[0] ?? {
        sort_mode: "recent", show_followed_members: true, show_communities: true,
      };
      const result = await pool.query(
        `INSERT INTO feed_preferences
          (user_id, sort_mode, show_followed_members, show_communities, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           sort_mode = EXCLUDED.sort_mode,
           show_followed_members = EXCLUDED.show_followed_members,
           show_communities = EXCLUDED.show_communities,
           updated_at = NOW()
         RETURNING sort_mode, show_followed_members, show_communities`,
        [
          req.user.id,
          body.sort ?? old.sort_mode,
          body.showFollowedMembers ?? old.show_followed_members,
          body.showCommunities ?? old.show_communities,
        ],
      );
      const p = result.rows[0];
      res.json({
        sort: p.sort_mode,
        showFollowedMembers: p.show_followed_members,
        showCommunities: p.show_communities,
      });
    } catch (err) { next(err); }
  });

  return router;
}
