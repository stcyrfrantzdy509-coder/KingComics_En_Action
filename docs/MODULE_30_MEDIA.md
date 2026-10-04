# KCA — Module 30 : gestion des médias

## Fichiers ajoutés
- `db/migrations/006_media.sql` : métadonnées des images et vidéos, états de traitement, propriétaire, taille, format et visibilité.
- `src/media/media.validation.js` : premières règles de validation déclarative et limites de taille.

## Limites initiales proposées pour le MVP
- Images : JPEG, PNG ou WebP, jusqu'à 10 Mio.
- Vidéos : MP4 ou WebM, jusqu'à 250 Mio et 3 minutes.
- Un média n'est utilisable dans les battles que lorsqu'il est au statut `ready`.

Ces valeurs sont des choix initiaux de conception, à ajuster selon le coût de stockage, les performances mobiles et les capacités de l'hébergement.

## Architecture sûre prévue
Les fichiers doivent être envoyés dans un stockage privé de quarantaine, puis vérifiés côté serveur. Le serveur doit contrôler les signatures réelles des fichiers, analyser les métadonnées, scanner les fichiers, transcoder les vidéos et ne les rendre disponibles qu'après validation. Les clés de stockage sont générées côté serveur. Aucun chemin fourni par le client ne doit être utilisé directement.

## À terminer avant déploiement
1. Choisir un stockage objet et vérifier ses quotas, tarifs et règles de confidentialité.
2. Implémenter les URL d'envoi signées ou un flux d'upload contrôlé.
3. Vérifier le contenu réel, calculer le SHA-256 et empêcher les fichiers malformés.
4. Ajouter antivirus/scanner et worker de transcodage isolé.
5. Ajouter suppression, rétention, droits d'accès, miniatures et contrôle de bande passante.
6. Adapter le schéma aux tables déjà présentes et ajouter des tests de fichiers trop grands, falsifiés, corrompus ou non autorisés.

## État réel
Le schéma et les helpers ont été préparés mais ne font pas encore d'upload réel. Aucun fournisseur de stockage n'est configuré, et les fichiers ne sont ni scannés ni transcodés par ce module. Le code n'a pas été testé sur une infrastructure de production. KCA n'est pas encore en ligne.
