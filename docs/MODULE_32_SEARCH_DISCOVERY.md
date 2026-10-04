# Module 32 — Recherche et découverte

## Objectif
Permettre aux membres de rechercher les profils, publications, communautés et battles
publiés publiquement, et d'explorer les contenus récemment indexés.

## Routes proposées
- `GET /api/search?q=<termes>&type=post&limit=15` : recherche plein texte.
- `GET /api/search/discover?type=battle&limit=8` : découverte par date de mise à jour.

`type` est facultatif et doit être `profile`, `post`, `community` ou `battle`.
La recherche exige entre 2 et 100 caractères et limite les résultats à 30.

## Indexation
`search-index.service.js` fournit des fonctions serveur pour créer/mettre à jour et supprimer
les documents d'index. Les services de profils, publications, communautés et battles devront
les appeler après chaque changement, idéalement dans la même transaction que l'écriture métier.

## Sécurité et limites
- Seuls les documents `published` et `public` sont renvoyés par ces routes.
- Ne pas indexer les messages privés, les brouillons, les publications masquées ou supprimées.
- Les contenus de membres doivent suivre les règles de visibilité et de consentement propres à KCA.
- Les extraits sont limités à 220 caractères; une étape supplémentaire devra retirer le HTML et les données sensibles.
- PostgreSQL utilise la configuration linguistique `simple`; la recherche française avancée (accents, racines, synonymes) pourra être améliorée ensuite.
- Prévoir limitation de débit, tests de permissions, tests d'injection, et tests de cohérence de l'index.

## Statut
Blueprint préparatoire : routes non montées, indexation non connectée aux autres modules,
migration non exécutée sur une base réelle et aucune mise en production.
