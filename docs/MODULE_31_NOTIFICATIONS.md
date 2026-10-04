# Module 31 — Notifications et activité

## Objectif
Centraliser les alertes utiles de KCA : commentaire/réponse, invitation à une communauté,
vote sur une battle, résultat publié, décision de modération et message système.

## Endpoints proposés
- `GET /api/notifications?limit=20&before=<id>` : liste paginée de l'utilisateur connecté et compteur non lu.
- `POST /api/notifications/:id/read` : marque une notification comme lue.
- `POST /api/notifications/read-all` : marque toutes les notifications du membre connecté comme lues.

Toutes les routes exigent une authentification. Le destinataire est toujours `req.user.id` :
le client ne peut ni lire ni modifier les notifications d'un autre membre. La création passe
par un service serveur appelé depuis les événements fiables; aucun endpoint public de création
n'est fourni.

## Fichiers
- `migrations/007_notifications.sql` : table, contraintes et index PostgreSQL.
- `src/notifications/notifications.service.js` : service de création avec clé de déduplication.
- `src/notifications/notifications.routes.blueprint.js` : routes Express à intégrer.

## Points de sécurité et d'intégration
1. Vérifier que `users.id` est bien de type `BIGINT`; adapter les types et noms si le schéma réel diffère.
2. Vérifier les imports ESM/CommonJS et la signature du middleware `requireAuth`.
3. Limiter et nettoyer `payload` côté serveur; ne jamais y placer de secrets ou de données privées inutiles.
4. Pour les événements sensibles (résultat de battle, sanction), créer la notification dans la même
   transaction que l'événement métier, ou utiliser une outbox transactionnelle.
5. Envoyer des notifications push/e-mail uniquement après consentement et configuration d'un fournisseur.
6. Ajouter tests d'accès inter-utilisateurs, pagination, compteurs non lus, déduplication et erreurs DB.

## Statut
Blueprint préparatoire : non monté dans le serveur, non testé contre une base réelle, non déployé.
Ce module ne fournit pas encore de notifications push en arrière-plan.
