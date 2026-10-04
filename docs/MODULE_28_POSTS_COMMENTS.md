# KCA — Module 28 : publications et commentaires

## Fichiers ajoutés
- `db/migrations/004_posts_comments.sql` : structure des publications et commentaires, contraintes et index.
- `src/posts/posts.routes.blueprint.js` : routes de lecture du fil public, création de publication, lecture des commentaires et ajout de commentaire.

## Comportement prévu
- Publication texte limitée à 5 000 caractères.
- Commentaire limité à 2 000 caractères.
- Fil public paginé par limite; la prochaine version doit compléter le curseur de pagination.
- Création réservée aux comptes authentifiés, actifs et vérifiés.
- Publications de communauté soumises à une vérification d’appartenance.
- Réponses limitées à un commentaire parent appartenant à la même publication.
- Les signalements et actions de modération doivent être raccordés au module dédié.

## Limites à traiter avant intégration
- Adapter les colonnes (`users.display_name`, IDs, tables) au schéma réel.
- Compléter la pagination par curseur et les règles de visibilité privée.
- Ajouter édition/suppression, nettoyage/filtrage, signalements, modération et journal d'audit.
- Ajouter tests d'intégration et tests d'accès non autorisé.
- Ajouter protection CSRF, limitation de débit réelle et gestion centralisée des erreurs.
- Vérifier que les contenus utilisateurs sont affichés comme texte échappé, jamais injectés comme HTML brut.

## État réel
Code de base préparé mais non monté dans Express et non testé avec une base PostgreSQL réelle. N'exécutez pas les migrations en production sans alignement, sauvegarde et tests. KCA n'est pas encore en ligne.
