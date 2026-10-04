// KCA Module 32 — Search/discovery Express blueprint
// Requires PostgreSQL full-text search and a trusted search_documents index.
// Apply visibility and publication rules here; never expose private content.

const ALLOWED_TYPES = new Set(["profile", "post", "community", "battle"]);

export function createSearchRouter({ express, pool, optionalAuth }) {
  const router = express.Router();

  router.get("/", optionalAuth, async (req, res, next) => {
    try {
      const q = String(req.query.q ?? "").trim();
      const type = req.query.type == null ? null : String(req.query.type);
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 15, 1), 30);
      if (q.length < 2 || q.length > 100) {
        return res.status(400).json({ error: "QUERY_LENGTH_MUST_BE_2_TO_100" });
      }
      if (type && !ALLOWED_TYPES.has(type)) {
        return res.status(400).json({ error: "INVALID_SEARCH_TYPE" });
      }

      // `websearch_to_tsquery` handles normal search syntax; the query remains parameterized.
      const result = await pool.query(
        `SELECT entity_type, entity_id, title, body, updated_at,
                ts_rank(search_vector, websearch_to_tsquery('simple', $1)) AS rank
         FROM search_documents
         WHERE status = 'published'
           AND visibility = 'public'
           AND ($2::text IS NULL OR entity_type = $2)
           AND search_vector @@ websearch_to_tsquery('simple', $1)
         ORDER BY rank DESC, updated_at DESC
         LIMIT $3`,
        [q, type, limit],
      );

      res.json({
        query: q,
        items: result.rows.map((row) => ({
          type: row.entity_type,
          id: row.entity_id,
          title: row.title,
          excerpt: String(row.body ?? "").slice(0, 220),
          updatedAt: row.updated_at,
        })),
      });
    } catch (err) { next(err); }
  });

  router.get("/discover", optionalAuth, async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), 20);
      const type = req.query.type == null ? null : String(req.query.type);
      if (type && !ALLOWED_TYPES.has(type)) {
        return res.status(400).json({ error: "INVALID_SEARCH_TYPE" });
      }
      const result = await pool.query(
        `SELECT entity_type, entity_id, title, body, updated_at
         FROM search_documents
         WHERE status = 'published'
           AND visibility = 'public'
           AND ($1::text IS NULL OR entity_type = $1)
         ORDER BY updated_at DESC
         LIMIT $2`,
        [type, limit],
      );
      res.json({
        items: result.rows.map((row) => ({
          type: row.entity_type, id: row.entity_id, title: row.title,
          excerpt: String(row.body ?? "").slice(0, 220), updatedAt: row.updated_at,
        })),
      });
    } catch (err) { next(err); }
  });

  return router;
}
