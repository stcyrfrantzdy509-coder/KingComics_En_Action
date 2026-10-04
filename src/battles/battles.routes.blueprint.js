/*
 * KCA Module 29 — battle route blueprint.
 * Not mounted in server.js and not production-ready until integrated and tested.
 */

import { z } from "zod";

const NewBattle = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().max(3000).default(""),
  category: z.enum(["rap", "freestyle", "gaming", "breakdance", "other"]),
  startsAt: z.string().datetime().optional(),
  submissionsCloseAt: z.string().datetime().optional(),
  votingCloseAt: z.string().datetime().optional(),
});

const NewSubmission = z.object({
  mediaId: z.number().int().positive().optional(),
  videoUrl: z.string().url().max(2048).optional(),
}).refine((v) => Boolean(v.mediaId || v.videoUrl), {
  message: "Un média vidéo est requis.",
});

export function createBattlesRouter({
  express,
  db,
  requireAuthenticated,
  requireActiveVerifiedAccount,
  battleLimiter,
  submissionLimiter,
  voteLimiter,
  canModerateBattle,
}) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    try {
      const result = await db.query(
        `SELECT b.id, b.title, b.description, b.category, b.status,
                b.starts_at, b.submissions_close_at, b.voting_close_at,
                b.created_at, u.display_name AS creator_display_name
           FROM battles b JOIN users u ON u.id = b.creator_id
          WHERE b.status IN ('open', 'voting', 'closed')
          ORDER BY b.created_at DESC, b.id DESC
          LIMIT 50`,
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
    battleLimiter,
    async (req, res, next) => {
      const parsed = NewBattle.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Battle invalide." });

      const data = parsed.data;
      const starts = data.startsAt ? new Date(data.startsAt) : null;
      const submissionsClose = data.submissionsCloseAt ? new Date(data.submissionsCloseAt) : null;
      const votingClose = data.votingCloseAt ? new Date(data.votingCloseAt) : null;
      if ((starts && submissionsClose && submissionsClose <= starts) ||
          (submissionsClose && votingClose && votingClose < submissionsClose)) {
        return res.status(400).json({ error: "Les dates de la battle sont incohérentes." });
      }

      try {
        const result = await db.query(
          `INSERT INTO battles
             (creator_id, title, description, category, status, starts_at,
              submissions_close_at, voting_close_at)
           VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7)
           RETURNING id, title, description, category, status, created_at`,
          [req.user.id, data.title, data.description, data.category,
           starts, submissionsClose, votingClose],
        );
        return res.status(201).json({ item: result.rows[0] });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:battleId/submissions",
    requireAuthenticated,
    requireActiveVerifiedAccount,
    submissionLimiter,
    async (req, res, next) => {
      const battleId = Number(req.params.battleId);
      if (!Number.isSafeInteger(battleId) || battleId <= 0) {
        return res.status(400).json({ error: "Battle invalide." });
      }
      const parsed = NewSubmission.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Vidéo invalide." });

      try {
        const battle = await db.query(
          `SELECT id, status, starts_at, submissions_close_at
             FROM battles WHERE id = $1 LIMIT 1`,
          [battleId],
        );
        const b = battle.rows[0];
        const now = new Date();
        if (!b || b.status !== "open" ||
            (b.starts_at && now < new Date(b.starts_at)) ||
            (b.submissions_close_at && now >= new Date(b.submissions_close_at))) {
          return res.status(409).json({ error: "Les dépôts ne sont pas ouverts." });
        }

        if (parsed.data.mediaId) {
          const media = await db.query(
            `SELECT id FROM media WHERE id = $1 AND owner_id = $2
              AND status = 'ready' LIMIT 1`,
            [parsed.data.mediaId, req.user.id],
          );
          if (media.rowCount === 0) {
            return res.status(400).json({ error: "Média indisponible ou non autorisé." });
          }
        } else {
          // External video URLs require a domain allowlist and safe-link checks
          // before enabling this branch. Do not fetch arbitrary URLs server-side.
          return res.status(400).json({ error: "Utilisez un média vidéo validé par KCA." });
        }

        const result = await db.query(
          `INSERT INTO battle_submissions
             (battle_id, participant_id, media_id, status)
           VALUES ($1, $2, $3, 'pending_review')
           RETURNING id, battle_id, participant_id, status, submitted_at`,
          [battleId, req.user.id, parsed.data.mediaId],
        );
        return res.status(201).json({ item: result.rows[0] });
      } catch (error) {
        if (error.code === "23505") {
          return res.status(409).json({ error: "Une participation existe déjà pour cette battle." });
        }
        next(error);
      }
    },
  );

  router.post(
    "/:battleId/votes",
    requireAuthenticated,
    requireActiveVerifiedAccount,
    voteLimiter,
    async (req, res, next) => {
      const battleId = Number(req.params.battleId);
      const submissionId = Number(req.body?.submissionId);
      if (!Number.isSafeInteger(battleId) || battleId <= 0 ||
          !Number.isSafeInteger(submissionId) || submissionId <= 0) {
        return res.status(400).json({ error: "Vote invalide." });
      }

      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const battleResult = await client.query(
          `SELECT id, status, voting_close_at FROM battles
            WHERE id = $1 FOR UPDATE`,
          [battleId],
        );
        const battle = battleResult.rows[0];
        if (!battle || battle.status !== "voting" ||
            (battle.voting_close_at && new Date() >= new Date(battle.voting_close_at))) {
          await client.query("ROLLBACK");
          return res.status(409).json({ error: "Le vote est fermé." });
        }

        const submission = await client.query(
          `SELECT id, participant_id FROM battle_submissions
            WHERE id = $1 AND battle_id = $2 AND status = 'approved'
            LIMIT 1`,
          [submissionId, battleId],
        );
        if (!submission.rows[0]) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Participation non admissible." });
        }
        if (String(submission.rows[0].participant_id) === String(req.user.id)) {
          await client.query("ROLLBACK");
          return res.status(403).json({ error: "Vous ne pouvez pas voter pour votre propre participation." });
        }

        await client.query(
          `INSERT INTO battle_votes (battle_id, submission_id, voter_id)
           VALUES ($1, $2, $3)`,
          [battleId, submissionId, req.user.id],
        );
        await client.query("COMMIT");
        return res.status(201).json({ message: "Vote enregistré." });
      } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
          return res.status(409).json({ error: "Vous avez déjà voté pour cette battle." });
        }
        return next(error);
      } finally {
        client.release();
      }
    },
  );

  // Result finalization is deliberately not exposed here. It must be a separate
  // audited admin/moderator operation that locks the battle, computes votes on
  // the server, writes one result and one ledger reward in a single transaction.
  void canModerateBattle;

  return router;
}
