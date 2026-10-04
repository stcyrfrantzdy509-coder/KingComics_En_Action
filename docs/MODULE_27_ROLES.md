# KCA — Module 27 : profils, rôles et permissions

## Ce qui est ajouté
- `db/migrations/003_permissions.sql` : vocabulaire des permissions et rôles au niveau des communautés.
- `src/permissions/authorization.js` : middleware de base pour exiger une connexion, une permission globale ou un rôle de membre dans une communauté.

## Règles produit retenues
- Un membre peut gérer son profil, publier, commenter et participer aux battles selon les règles applicables.
- Un gestionnaire de communauté peut gérer les paramètres et les membres de sa communauté, sans obtenir des droits globaux.
- Un modérateur peut traiter les contenus et signalements selon les permissions accordées.
- Un administrateur peut gérer les signalements et appliquer des suspensions autorisées.
- Le rôle propriétaire est protégé : aucune route publique ne peut le donner, et un administrateur ne peut pas le transférer ni se l'attribuer.

## Point technique important
Le middleware suppose une table `user_roles(user_id, role_name)` et un identifiant `req.user` déjà construit par une authentification fiable. Comparez ces noms au schéma existant avant intégration. Les rôles globaux et les rôles d'une communauté sont différents et doivent être vérifiés dans leur propre portée.

## Avant déploiement
1. Aligner la migration avec les types et noms réels du schéma.
2. Créer/valider la table `user_roles` si elle n'existe pas.
3. Ajouter une procédure sécurisée et auditée pour attribuer les rôles globaux.
4. Vérifier l'autorisation sur chaque route serveur, pas uniquement dans l'interface.
5. Ajouter des tests pour accès anonyme, membre ordinaire, rôle communautaire hors périmètre, admin et propriétaire.
6. Ajouter audit et protection contre les modifications concurrentes des rôles.
7. Ne pas exécuter la migration en production sans sauvegarde, revue et tests.

## État
Fichiers préparés dans le paquet de démarrage. Ils ne sont pas branchés au serveur ni validés sur une base PostgreSQL réelle. KCA n'est pas encore en ligne.
