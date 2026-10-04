/*
 * KCA Module 28 — feed and comments route blueprint.
 *
 * Blueprint only: it is not mounted in server.js and has not been tested
 * against the actual database. Inject authentication/authorization middleware
 * and rate limiters. The schema names must match the applied migrations.
 */

import { z } from "zod";

const NewPost = z.object({
  body: z.string().trim().min(1).max(5000),
  visibility: z.enum(["public", "community", "private"]).default("public"),
  communityId: z.number().int().positive().optional(),
}).superRefine((value, ctx) => {
  if (value.visibility === "community" && !value.communityId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Une communauté est requise pour cette visibilité.",
      path: ["communityId"],
    });
  }
});

const NewComment = z.object({
  body: z.string().trim().min(1).max(2000),
  parentCommentId: z.number().int().positive().optional(),
});

export function createPostsRouter({
  express,
  db,
  requireAuthenticated,
  requireActiveVerifiedAccount,
  postLimiter,
  commentLimiter,
}) {
  const router = express.Router();

  // Cursor pagination avoids large OFFSET scans. Cursor format is "timestamp|id";
  // validate/encode it in production rather than trusting arbitrary input.
  router.get("/", async (req, res, next) => {
    try {
      const limitRaw = Number(req.query.limit ?? 20);
      const limit = Number.isInteger(limitRaw) ? Math.max(1, Math.min(50, limitRaw)) : 20;
      const result = await db.query(
        `SELECT p.id, p.author_id, p.body, p.created_at,
                u.display_name AS author_display_name
           FROM posts p
           JOIN users u ON u.id = p.author_id
          WHERE p.status = 'published'
            AND p.visibility = 'public'
          ORDER BY p.created_at DESC, p.id DESC
          LIMIT $1`,
        [limit],
      );
      return res.json({ items: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/",
    requireAuthenticated,
    requireActiveVerifiedAccount,
    postLimiter,
    async (req, res, next) => {
      const parsed = NewPost.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Publication invalide." });
      }
      const data = parsed.data;

      try {
        if (data.visibility === "community") {
          const member = await db.query(
            `SELECT 1 FROM community_memberships
              WHERE community_id = $1 AND user_id = $2 AND status = 'active'
              LIMIT 1`,
            [data.communityId, req.user.id],
          );
          if (member.rowCount === 0) {
            return res.status(403).json({ error: "Accès à cette communauté refusé." });
          }
        }

        const result = await db.query(
          `INSERT INTO posts (author_id, body, visibility, community_id, status)
           VALUES ($1, $2, $3, $4, 'published')
           RETURNING id, author_id, body, visibility, community_id, created_at`,
          [
            req.user.id,
            data.body,
            data.visibility,
            data.visibility === "community" ? data.communityId : null,
          ],
        );
        return res.status(201).json({ item: result.rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get("/:postId/comments", async (req, res, next) => {
    try {
      const postId = Number(req.params.postId);
      if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({ error: "Publication invalide." });
      }
      const result = await db.query(
        `SELECT c.id, c.post_id, c.author_id, c.parent_comment_id,
                c.body, c.created_at, u.display_name AS author_display_name
           FROM comments c
           JOIN posts p ON p.id = c.post_id
           JOIN users u ON u.id = c.author_id
          WHERE c.post_id = $1
            AND c.status = 'published'
            AND p.status = 'published'
            AND p.visibility = 'public'
          ORDER BY c.created_at ASC, c.id ASC
          LIMIT 200`,
        [postId],
      );
      return res.json({ items: result.rows });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    "/:postId/comments",
    requireAuthenticated,
    requireActiveVerifiedAccount,
    commentLimiter,
    async (req, res, next) => {
      const postId = Number(req.params.postId);
      if (!Number.isSafeInteger(postId) || postId <= 0) {
        return res.status(400).json({ error: "Publication invalide." });
      }
      const parsed = NewComment.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Commentaire invalide." });
      }

      try {
        const post = await db.query(
          `SELECT id, visibility, community_id FROM posts
            WHERE id = $1 AND status = 'published'
            LIMIT 1`,
          [postId],
        );
        if (!post.rows[0] || post.rows[0].visibility !== "public") {
          // Community/private post access must be implemented before enabling
          // comments for those visibilities.
          return res.status(404).json({ error: "Publication introuvable." });
        }

        if (parsed.data.parentCommentId) {
          const parent = await db.query(
            `SELECT id FROM comments
              WHERE id = $1 AND post_id = $2 AND status = 'published'
              LIMIT 1`,
            [parsed.data.parentCommentId, postId],
          );
          if (parent.rowCount === 0) {
            return res.status(400).json({ error: "Commentaire parent invalide." });
          }
        }

        const result = await db.query(
          `INSERT INTO comments (post_id, author_id, parent_comment_id, body)
           VALUES ($1, $2, $3, $4)
           RETURNING id, post_id, author_id, parent_comment_id, body, created_at`,
          [postId, req.user.id, parsed.data.parentCommentId ?? null, parsed.data.body],
        );
        return res.status(201).json({ item: result.rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
