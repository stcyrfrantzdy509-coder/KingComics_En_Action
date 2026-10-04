# KCA — Module 26 : base d’authentification

## Objectif
Préparer l’inscription par e-mail, la vérification d’adresse, la connexion et la déconnexion avec une frontière de sécurité côté serveur.

## Fichiers ajoutés
- `db/migrations/002_auth_support.sql` : tables de sessions, de vérification d’e-mail et de réinitialisation de mot de passe.
- `src/auth/auth.routes.blueprint.js` : blueprint des routes d’inscription/connexion/déconnexion avec Argon2id, validation Zod, jetons aléatoires et limitation de débit injectée.

## Important
Ce module est une base de travail, **pas une authentification prête à déployer**. Il n’est pas encore branché au serveur et n’a pas été testé contre une vraie base PostgreSQL. Le blueprint suppose que le schéma `users` a les colonnes indiquées dans le commentaire SQL. Il faudra adapter les noms si le schéma initial diffère.

## Décisions de sécurité retenues
- Mot de passe haché avec Argon2id, jamais conservé en clair.
- Vérification d’e-mail obligatoire avant connexion.
- Jetons aléatoires à usage limité; seuls leurs condensats sont enregistrés.
- Réponses génériques pour limiter l’énumération des comptes.
- Identifiant de session renouvelé après connexion.
- Cookies de session `HttpOnly`, `SameSite=Lax`, `Secure` en production.
- Contrôles de permissions effectués sur le serveur, pas seulement dans l’interface.

## À terminer avant déploiement
1. Comparer et aligner la migration sur le schéma SQL actuel.
2. Ajouter les dépendances `argon2` et `zod`, ainsi qu’un magasin de sessions PostgreSQL, une protection CSRF et un limiteur de débit.
3. Choisir/configurer un fournisseur d’e-mails transactionnels et créer les modèles de messages.
4. Implémenter confirmation d’e-mail et récupération/réinitialisation du mot de passe avec consommation atomique des jetons.
5. Révoquer les sessions après réinitialisation du mot de passe.
6. Ajouter des tests d’intégration et de sécurité : doublons d’e-mail, jeton expiré/réutilisé, session, CSRF, limitation de débit, permissions et erreurs de base.
7. Ne jamais utiliser le magasin de sessions mémoire d’Express en production.
8. Ne pas déployer avant revue de sécurité et tests sur une base de test.

## Dépendances à prévoir
`argon2`, `zod`, `express-session`, `connect-pg-simple`, `express-rate-limit` et une solution CSRF compatible avec la version Express retenue, plus un client e-mail comme `nodemailer` ou un fournisseur API. Les versions exactes doivent être verrouillées après vérification de compatibilité et tests.

## État réel
Les fichiers ont été créés dans le paquet de démarrage. Aucun compte utilisateur réel n’a été créé, aucun e-mail n’est envoyé et le site n’est pas encore en ligne.
