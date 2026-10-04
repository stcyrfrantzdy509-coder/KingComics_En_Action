// KCA Module 32 — Index synchronization blueprint.
// Call from trusted application services after content changes.
// Use the same transaction/client as the content mutation where possible.

const ENTITY_TYPES = new Set(["profile", "post", "community", "battle"]);

export async function upsertSearchDocument(db, doc) {
  if (!ENTITY_TYPES.has(doc.entityType)) throw new Error("INVALID_SEARCH_ENTITY_TYPE");
  if (!Number.isSafeInteger(Number(doc.entityId))) throw new Error("INVALID_SEARCH_ENTITY_ID");

  const visibility = ["public", "members", "private"].includes(doc.visibility)
    ? doc.visibility : "public";
  const status = ["published", "hidden", "removed", "draft"].includes(doc.status)
    ? doc.status : "draft";

  await db.query(
    `INSERT INTO search_documents
      (entity_type, entity_id, owner_user_id, title, body, visibility, status, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (entity_type, entity_id) DO UPDATE SET
       owner_user_id = EXCLUDED.owner_user_id,
       title = EXCLUDED.title,
       body = EXCLUDED.body,
       visibility = EXCLUDED.visibility,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      doc.entityType, Number(doc.entityId),
      doc.ownerUserId == null ? null : Number(doc.ownerUserId),
      String(doc.title ?? "").slice(0, 200),
      String(doc.body ?? "").slice(0, 10000),
      visibility, status,
    ],
  );
}

export async function removeSearchDocument(db, entityType, entityId) {
  if (!ENTITY_TYPES.has(entityType)) throw new Error("INVALID_SEARCH_ENTITY_TYPE");
  await db.query(
    `DELETE FROM search_documents WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, Number(entityId)],
  );
}
