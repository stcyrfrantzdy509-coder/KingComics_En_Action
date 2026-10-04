# KCA — Module 29 : battles vidéo et votes

## Fichiers ajoutés
- `db/migrations/005_battles.sql` : battles, participations, votes, résultats et registre des points.
- `src/battles/battles.routes.blueprint.js` : routes de lecture, création de battle, dépôt d'une vidéo KCA validée et vote.

## Règles prévues
- Les battles peuvent concerner le rap, le freestyle, le gaming, le breakdance ou une autre catégorie.
- Les participations doivent être approuvées avant d'être votables.
- Une personne ne peut déposer qu'une participation par battle.
- Une personne ne peut voter qu'une seule fois par battle, garanti par une contrainte SQL.
- Une personne ne peut pas voter pour sa propre participation.
- Le serveur contrôle les périodes de dépôt et de vote.
- Les points sont consignés dans un registre avec une contrainte d'unicité pour prévenir les récompenses répétées.

## Limites à régler avant déploiement
- Aligner les noms/types de colonnes sur le schéma réel (`media.owner_id`, `media.status`, `users.display_name`, etc.).
- Ajouter les transitions de statut autorisées et les routes de modération/revue.
- Implémenter la finalisation des résultats dans une transaction sérialisée et auditée.
- Définir la politique d'égalité, d'annulation, de contestation et de fraude.
- Mettre en place la validation, transcodage, limites de taille, analyse antivirus et stockage privé/public contrôlé des vidéos.
- Ne pas activer les liens externes sans liste de domaines autorisés et vérifications de sécurité.
- Ajouter tests d'intégration pour les votes simultanés, doublons, fenêtres temporelles, comptes suspendus et attribution des points.
- Les points et le gagnant ne doivent jamais être acceptés depuis le client.

## État réel
Fichiers préparés dans le projet de démarrage, mais non branchés au serveur et non testés sur une vraie base PostgreSQL. La migration doit être revue et testée avant utilisation. KCA n'est pas encore en ligne.
