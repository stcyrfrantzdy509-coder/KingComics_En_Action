// KCA Module 31 — Notification service blueprint
// Call only from trusted server-side event handlers; never expose arbitrary
// recipient/type creation directly to public clients.

const ALLOWED_TYPES = new Set([
  "post_comment", "post_reply", "community_invite",
  "battle_vote", "battle_result", "moderation_update", "system",
]);

function asNotification(row) {
  return {
    id: row.id,
    type: row.type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    body: row.body,
    payload: row.payload,
    createdAt: row.created_at,
    readAt: row.read_at,
    actor: row.actor_user_id == null ? null : { id: row.actor_user_id },
  };
}

export function createNotificationService(pool) {
  return {
    async create(input) {
      if (!ALLOWED_TYPES.has(input.type)) throw new Error("INVALID_NOTIFICATION_TYPE");
      if (!Number.isSafeInteger(Number(input.recipientUserId))) throw new Error("INVALID_RECIPIENT");
      const title = String(input.title ?? "").trim();
      const body = input.body == null ? null : String(input.body).trim();
      if (!title || title.length > 160 || (body && body.length > 500)) {
        throw new Error("INVALID_NOTIFICATION_TEXT");
      }

      const result = await pool.query(
        `INSERT INTO notifications
          (recipient_user_id, actor_user_id, type, entity_type, entity_id,
           title, body, payload, dedupe_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
         ON CONFLICT (recipient_user_id, dedupe_key)
           WHERE dedupe_key IS NOT NULL
         DO NOTHING
         RETURNING *`,
        [
          Number(input.recipientUserId),
          input.actorUserId == null ? null : Number(input.actorUserId),
          input.type,
          input.entityType ?? null,
          input.entityId == null ? null : Number(input.entityId),
          title,
          body,
          JSON.stringify(input.payload ?? {}),
          input.dedupeKey ?? null,
        ],
      );
      return result.rows[0] ? asNotification(result.rows[0]) : null;
    },
  };
}
