// KCA Module 33 — Profile routes blueprint.
// Assumptions: requireAuth sets req.user.id; media records are validated elsewhere.
// Align user/profile table columns with the actual database before mounting.

export function createProfileRouter({ express, pool, requireAuth, optionalAuth }) {
  const router = express.Router();

  router.get("/me/preferences", requireAuth, async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT profile_visibility, show_activity, show_follow_counts,
                allow_community_invites, updated_at
         FROM profile_preferences WHERE user_id = $1`,
        [req.user.id],
      );
      const p = result.rows[0] ?? {
        profile_visibility: "public",
        show_activity: true,
        show_follow_counts: true,
        allow_community_invites: true,
        updated_at: null,
      };
      res.json({
        visibility: p.profile_visibility,
        showActivity: p.show_activity,
        showFollowCounts: p.show_follow_counts,
        allowCommunityInvites: p.allow_community_invites,
        updatedAt: p.updated_at,
      });
    } catch (err) { next(err); }
  });

  router.patch("/me/preferences", requireAuth, async (req, res, next) => {
    try {
      const allowed = ["public", "members", "private"];
      const body = req.body ?? {};
      if (body.visibility !== undefined && !allowed.includes(body.visibility)) {
        return res.status(400).json({ error: "INVALID_VISIBILITY" });
      }
      for (const key of ["showActivity", "showFollowCounts", "allowCommunityInvites"]) {
        if (body[key] !== undefined && typeof body[key] !== "boolean") {
          return res.status(400).json({ error: "INVALID_PREFERENCE", field: key });
        }
      }

      const current = await pool.query(
        `SELECT profile_visibility, show_activity, show_follow_counts, allow_community_invites
         FROM profile_preferences WHERE user_id = $1`,
        [req.user.id],
      );
      const old = current.rows[0] ?? {
        profile_visibility: "public", show_activity: true,
        show_follow_counts: true, allow_community_invites: true,
      };

      const result = await pool.query(
        `INSERT INTO profile_preferences
          (user_id, profile_visibility, show_activity, show_follow_counts,
           allow_community_invites, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           profile_visibility = EXCLUDED.profile_visibility,
           show_activity = EXCLUDED.show_activity,
           show_follow_counts = EXCLUDED.show_follow_counts,
           allow_community_invites = EXCLUDED.allow_community_invites,
           updated_at = NOW()
         RETURNING profile_visibility, show_activity, show_follow_counts,
                   allow_community_invites, updated_at`,
        [
          req.user.id,
          body.visibility ?? old.profile_visibility,
          body.showActivity ?? old.show_activity,
          body.showFollowCounts ?? old.show_follow_counts,
          body.allowCommunityInvites ?? old.allow_community_invites,
        ],
      );
      const p = result.rows[0];
      res.json({
        visibility: p.profile_visibility,
        showActivity: p.show_activity,
        showFollowCounts: p.show_follow_counts,
        allowCommunityInvites: p.allow_community_invites,
        updatedAt: p.updated_at,
      });
    } catch (err) { next(err); }
  });

  // Public profile summary. Replace the assumed users columns after schema review.
  router.get("/:userId", optionalAuth, async (req, res, next) => {
    try {
      const userId = Number.parseInt(req.params.userId, 10);
      if (!Number.isSafeInteger(userId) || userId < 1) {
        return res.status(400).json({ error: "INVALID_USER_ID" });
      }
      const result = await pool.query(
        `SELECT u.id, u.username, u.display_name, u.bio, u.created_at,
                COALESCE(pp.profile_visibility, 'public') AS profile_visibility,
                COALESCE(pp.show_follow_counts, TRUE) AS show_follow_counts,
                COALESCE(pp.show_activity, TRUE) AS show_activity
         FROM users u
         LEFT JOIN profile_preferences pp ON pp.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [userId],
      );
      if (!result.rowCount) return res.status(404).json({ error: "PROFILE_NOT_FOUND" });
      const p = result.rows[0];
      const viewerId = req.user?.id == null ? null : Number(req.user.id);
      const isOwner = viewerId === Number(p.id);
      if (!isOwner && p.profile_visibility === "private") {
        return res.status(404).json({ error: "PROFILE_NOT_FOUND" });
      }
      if (!isOwner && p.profile_visibility === "members" && viewerId === null) {
        return res.status(404).json({ error: "PROFILE_NOT_FOUND" });
      }
      res.json({
        id: p.id, username: p.username, displayName: p.display_name,
        bio: p.bio, createdAt: p.created_at,
        showFollowCounts: isOwner || p.show_follow_counts,
        showActivity: isOwner || p.show_activity,
      });
    } catch (err) { next(err); }
  });

  return router;
}
