/*
 * KCA Module 26 — authentication route blueprint.
 *
 * This file is intentionally a blueprint, not production-ready code.
 * It documents the security boundary and expected flows; wire it into
 * src/server.js only after the dependencies, email provider, session store,
 * CSRF protection, schema, and tests have been configured.
 *
 * Never store raw verification/reset tokens. Never log passwords or tokens.
 */

import crypto from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";

const Signup = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  displayName: z.string().trim().min(2).max(40),
});

const tokenHash = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const newToken = () => crypto.randomBytes(32).toString("base64url");

/**
 * Dependencies are injected to keep security-sensitive infrastructure explicit.
 * db: PostgreSQL pool
 * sendVerificationEmail: configured transactional email provider
 * sessionMiddleware: express-session backed by PostgreSQL
 */
export function createAuthRouter({
  express,
  db,
  sendVerificationEmail,
  sessionMiddleware,
  loginLimiter,
  signupLimiter,
}) {
  const router = express.Router();

  router.use(sessionMiddleware);

  router.post("/signup", signupLimiter, async (req, res, next) => {
    try {
      const parsed = Signup.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Données invalides." });
      }

      const email = parsed.data.email.toLowerCase();
      const passwordHash = await argon2.hash(parsed.data.password, {
        type: argon2.argon2id,
      });

      const rawToken = newToken();
      const hashedToken = tokenHash(rawToken);
      const client = await db.connect();

      try {
        await client.query("BEGIN");
        const result = await client.query(
          `INSERT INTO users (email, password_hash, status, created_at)
           VALUES ($1, $2, 'pending_verification', NOW())
           RETURNING id`,
          [email, passwordHash],
        );
        const userId = result.rows[0].id;

        await client.query(
          `INSERT INTO email_verification_tokens
             (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
          [userId, hashedToken],
        );
        await client.query("COMMIT");

        // Deliver only after the transaction commits. If email fails, provide
        // a safe resend flow; do not return the raw token in the API response.
        await sendVerificationEmail({ email, token: rawToken });
      } catch (error) {
        await client.query("ROLLBACK");
        // Avoid exposing whether an email address already exists.
        if (error.code === "23505") {
          return res.status(202).json({
            message: "Si l’adresse peut être utilisée, un courriel sera envoyé.",
          });
        }
        throw error;
      } finally {
        client.release();
      }

      return res.status(202).json({
        message: "Vérifiez votre boîte mail pour confirmer l’adresse.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", loginLimiter, async (req, res, next) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      if (!email || !password || password.length > 128) {
        return res.status(400).json({ error: "Identifiants invalides." });
      }

      const result = await db.query(
        `SELECT id, email, password_hash, email_verified_at, status
         FROM users WHERE email = $1 LIMIT 1`,
        [email],
      );
      const user = result.rows[0];
      const valid = user
        ? await argon2.verify(user.password_hash, password).catch(() => false)
        : false;

      // Keep the response generic to reduce account enumeration.
      if (!valid || !user.email_verified_at || user.status !== "active") {
        return res.status(401).json({ error: "Connexion impossible avec ces identifiants." });
      }

      // Regenerate session ID after login to prevent session fixation.
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) return next(saveErr);
          return res.status(200).json({
            user: { id: user.id, email: user.email },
          });
        });
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("kca.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
      return res.status(204).end();
    });
  });

  // TODO before deployment:
  // 1) GET/POST email verification endpoint: hash submitted token, lock row,
  //    check expires_at and consumed_at, set email_verified_at + status='active',
  //    mark token consumed in one transaction.
  // 2) Forgot/reset password endpoints: generic response, rate limiting,
  //    one-use 30-minute tokens, transactional consumption, revoke sessions.
  // 3) CSRF protection on state-changing requests and strict Origin checks.
  // 4) Configure secure PostgreSQL session store; MemoryStore is not production.
  // 5) Add audit events without secrets, account lock/rate controls, and tests.

  return router;
}
