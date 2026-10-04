# Module 33 — Profils et personnalisation

## Fonctionnalités préparées
- Résumé de profil : nom d'utilisateur, nom affiché, biographie et date de création.
- Préférences de visibilité : public, membres connectés, privé.
- Choix d'afficher ou non l'activité et les compteurs d'abonnements.
- Préférence pour autoriser les invitations aux communautés.
- Affectation d'une image déjà validée comme avatar ou bannière.

## Routes proposées
- `GET /api/profiles/me/preferences` : lire ses préférences.
- `PATCH /api/profiles/me/preferences` : modifier uniquement les préférences autorisées.
- `GET /api/profiles/:userId` : consulter un profil selon sa visibilité.

## Dépendances et hypothèses
Les routes supposent que `users` contient `username`, `display_name`, `bio`, `created_at`,
et que la table `media` contient `owner_user_id`, `status`, `media_type`. Ces colonnes doivent
être vérifiées et adaptées au schéma final. La migration ajoute les préférences et l'affectation
des médias de profil; elle ne crée ni upload ni traitement d'image.

## Sécurité et tests à prévoir
- Authentification obligatoire pour modifier les préférences.
- Les membres ne peuvent modifier que leur propre profil.
- Les profils privés renvoient une réponse 404 aux autres visiteurs.
- Tester les profils privés/membres, les utilisateurs inexistants, les types invalides et les médias non possédés.
- Ajouter validation et limitation de longueur pour le nom affiché et la biographie dans le module de mise à jour du profil.
- Avant production, intégrer les compteurs d'abonnements et l'activité avec des requêtes adaptées et vérifiées.

## Statut
Blueprint préparatoire : non monté, non testé avec une base réelle, non déployé.
