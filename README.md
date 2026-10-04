# KingComics_En_Action (KCA)

Plateforme communautaire mobile-first autour du rap/freestyle, du gaming et du breakdance.

## État du dépôt

Cette archive regroupe le socle technique initial et les blueprints des modules 26 à 35. **Ce n'est pas encore une application complète prête pour la production.** Plusieurs routes/modules sont des bases de travail non intégrées et non testées ensemble. Le stockage réel des médias, l'intégration des migrations, la configuration de la base de données, les tests de sécurité et le déploiement restent à faire.

## Contenu

- `src/server.js` : serveur Express de départ
- `public/index.html` : maquette web de départ
- `src/auth/` : blueprint d'authentification
- `src/permissions/` : base de rôles et permissions
- `src/posts/` : publications et commentaires
- `src/battles/` : battles et votes
- `src/media/` : validation/métadonnées des médias
- `src/notifications/` : notifications
- `src/search/` : recherche et découverte
- `src/profiles/` : profils
- `src/follows/` : abonnements entre membres
- `src/feed/` : fil d'actualité personnalisé
- `db/migrations/` et `migrations/` : migrations SQL des modules
- `docs/` : notes d'intégration par module

## Démarrage local (socle uniquement)

1. Installer Node.js LTS.
2. Copier `.env.example` vers `.env` et compléter les valeurs localement.
3. Installer les dépendances avec `npm install`.
4. Lancer `npm start`.

Le démarrage du socle ne signifie pas que tous les modules sont branchés. Vérifier le contenu de `src/server.js` et les guides `docs/` avant d'activer des routes.

## Sécurité

- Ne jamais committer `.env`, mots de passe, clés API ou jetons.
- Utiliser des secrets distincts en local et en hébergement.
- Avant une mise en ligne publique, intégrer et tester l'authentification, les permissions, les migrations et les protections anti-abus.
