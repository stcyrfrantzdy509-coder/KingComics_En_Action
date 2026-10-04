/*
 * KCA Module 27 — server-side authorization helpers.
 *
 * This module is framework-agnostic. It assumes authentication middleware
 * sets req.user from a verified session and that global roles are loaded from
 * the database, not accepted from client request bodies.
 */

export function requireAuthenticated(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Connexion requise." });
  }
  return next();
}

export function requirePermission(db, permissionKey) {
  return async function permissionMiddleware(req, res, next) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Connexion requise." });
      }

      const result = await db.query(
        `SELECT 1
           FROM user_roles ur
           JOIN role_permissions rp ON rp.role_name = ur.role_name
          WHERE ur.user_id = $1
            AND rp.permission_key = $2
          LIMIT 1`,
        [req.user.id, permissionKey],
      );

      if (result.rowCount === 0) {
        return res.status(403).json({ error: "Permission insuffisante." });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/**
 * Community-level checks: always scope the membership lookup to the requested
 * community and current user. Never trust a role supplied by the client.
 */
export function requireCommunityRole(db, allowedRoles) {
  return async function communityRoleMiddleware(req, res, next) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: "Connexion requise." });
      }

      const communityId = Number(req.params.communityId);
      if (!Number.isSafeInteger(communityId) || communityId <= 0) {
        return res.status(400).json({ error: "Communauté invalide." });
      }

      const result = await db.query(
        `SELECT membership_role
           FROM community_memberships
          WHERE community_id = $1
            AND user_id = $2
            AND status = 'active'
          LIMIT 1`,
        [communityId, req.user.id],
      );

      if (!result.rows[0] || !allowedRoles.includes(result.rows[0].membership_role)) {
        return res.status(403).json({ error: "Rôle insuffisant dans cette communauté." });
      }
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

/*
 * Critical invariant:
 * - Never expose an endpoint that accepts role='owner' or role='admin'
 *   from a user request.
 * - Role changes must use a dedicated server-side service with audit logging,
 *   a strict allowlist, and a protected operator/owner workflow.
 * - Even an admin must not be able to grant or transfer the owner role.
 * - Do not trust hidden buttons or client-side route guards as security.
 */
