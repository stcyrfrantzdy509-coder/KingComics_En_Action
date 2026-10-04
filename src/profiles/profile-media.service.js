// KCA Module 33 — Profile media assignment blueprint.
// This assigns an already-validated media record; it does not upload files.

export async function setProfileMedia(db, { userId, mediaId, kind }) {
  if (!["avatar", "banner"].includes(kind)) throw new Error("INVALID_PROFILE_MEDIA_KIND");
  const media = await db.query(
    `SELECT id, owner_user_id, status, media_type
     FROM media WHERE id = $1`,
    [mediaId],
  );
  if (!media.rowCount) throw new Error("MEDIA_NOT_FOUND");
  const m = media.rows[0];
  if (Number(m.owner_user_id) !== Number(userId)) throw new Error("MEDIA_NOT_OWNED_BY_USER");
  if (m.status !== "ready") throw new Error("MEDIA_NOT_READY");
  if (kind === "avatar" && !String(m.media_type).startsWith("image/")) {
    throw new Error("AVATAR_MUST_BE_IMAGE");
  }
  if (kind === "banner" && !String(m.media_type).startsWith("image/")) {
    throw new Error("BANNER_MUST_BE_IMAGE");
  }

  await db.query(
    `INSERT INTO profile_media (user_id, media_kind, media_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, media_kind) DO UPDATE SET
       media_id = EXCLUDED.media_id, created_at = NOW()`,
    [userId, kind, mediaId],
  );
}
