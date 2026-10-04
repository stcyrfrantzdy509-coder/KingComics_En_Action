# Préparation du déploiement sur Render

Ce projet n'est pas encore validé pour un déploiement public. Avant de connecter Render :

1. Intégrer et tester les modules nécessaires.
2. Créer une base PostgreSQL et appliquer les migrations dans l'ordre, après vérification.
3. Configurer les variables d'environnement dans Render (ne pas envoyer `.env`).
4. Vérifier le port d'écoute et le script `npm start`.
5. Ajouter des tests de santé, des tests fonctionnels et des contrôles de sécurité.
6. Déployer d'abord en environnement de test, puis vérifier les journaux et les parcours principaux.

Ne pas considérer le simple fait que Render puisse lire le dépôt comme une preuve que l'application fonctionne.
