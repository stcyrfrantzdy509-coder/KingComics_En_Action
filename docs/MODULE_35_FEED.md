# Module 35 — Fil d'actualité personnalisé

## Objectif
Préparer un fil d'actualité lisible sur téléphone, avec les publications publiques récentes
et un tri simple par récence ou activité.

## Routes proposées
- `GET /api/feed?limit=20&before=<postId>&sort=recent|popular` : fil paginé.
- `GET /api/feed/preferences` : lire les préférences du membre connecté.
- `PATCH /api/feed/preferences` : modifier le tri et les catégories affichées.

## Règles prévues
- Limite de 30 publications par requête.
- Pagination par curseur basé sur l'identifiant de publication.
- Les brouillons, contenus masqués et publications non publiques sont exclus.
- Le serveur déduit l'identité du membre à partir de la session; aucun userId client n'est accepté pour personnaliser le fil.

## À intégrer/adapter
Le blueprint suppose que `posts` possède `user_id`, `body`, `status`, `visibility`, `created_at`,
et que `comments` possède `post_id` et `status`. Vérifier les noms réels et ajouter la source des
likes/réactions avant de présenter un compteur de likes. Le tri `popular` est provisoirement basé
sur les commentaires, pas sur un score d'engagement complet. Les options `show_followed_members`
et `show_communities` sont enregistrées, mais doivent encore être appliquées à la requête du fil.
L'inclusion des publications des communautés nécessitera l'intégration du modèle d'appartenance
et des règles de visibilité correspondantes.

## Statut
Blueprint préparatoire : routes non montées, schéma non validé sur une base réelle, non testé et non déployé.
