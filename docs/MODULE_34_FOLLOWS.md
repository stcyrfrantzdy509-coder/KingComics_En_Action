# Module 34 — Abonnements entre membres

## Fonctionnalités préparées
- Suivre et ne plus suivre un membre.
- Consulter la liste des abonnés et des comptes suivis.
- Voir les compteurs et savoir si le membre connecté suit déjà le profil.
- Empêcher l'auto-abonnement et les doublons.

## Routes proposées
- `POST /api/follows/:userId` : suivre un membre.
- `DELETE /api/follows/:userId` : arrêter de le suivre.
- `GET /api/follows/:userId/followers?limit=20&before=<id>` : liste des abonnés.
- `GET /api/follows/:userId/following?limit=20&before=<id>` : liste des abonnements.
- `GET /api/follows/:userId/status` : compteurs et statut pour le visiteur connecté.

## Notes d'intégration
- Le middleware `requireAuth` doit fournir `req.user.id`; `optionalAuth` doit fonctionner avec les visiteurs anonymes.
- Vérifier les colonnes `users.username` et `users.display_name` ainsi que le type réel de `users.id`.
- Les listes sont paginées et limitées à 50 éléments par appel.
- Avant production, ajouter des tests, des limites de débit et vérifier les règles de visibilité des profils.
- Le tri/cursor actuel utilise les identifiants des utilisateurs : simple et stable, mais un curseur composite sur date + ID sera préférable pour une chronologie exacte.

## Statut
Blueprint préparatoire : non monté dans le serveur, non testé contre une base réelle et non déployé.
