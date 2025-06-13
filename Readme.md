# Application de Gestion de Commandes

Une application web complète pour la gestion de commandes avec interface utilisateur, administration et base de données SQLite.

## 🚀 Fonctionnalités

### Interface Utilisateur
- **Formulaire de commande** : Interface intuitive pour passer des commandes
- **Sélection de produits** : Liste déroulante avec prix affichés
- **Gestion des quantités** : Possibilité de commander plusieurs articles
- **Validation en temps réel** : Contrôles de saisie et messages d'erreur

### Administration (Protégée par authentification)
- **Gestion des produits** : Ajouter, modifier et supprimer des produits
- **Activation/Désactivation des commandes** : Contrôle global du système de commandes
- **Gestion du lien menu** : Modifier le lien vers le menu complet depuis l'interface admin
- **Réinitialisation des commandes** : Supprimer toutes les commandes avec double confirmation
- **Tableau de bord** : Statistiques en temps réel
- **Récapitulatif des commandes** : Vue d'ensemble de toutes les commandes avec gestion des paiements
- **Interface responsive** : Optimisée pour tous les écrans

### Base de Données
- **SQLite** : Base de données légère stockée dans `/data`
- **Tables** : Products, Orders, Order_Items, System_Settings
- **Relations** : Gestion des clés étrangères
- **Initialisation automatique** : Création des tables et données de test
- **Paramètres système** : Configuration pour activer/désactiver les commandes

## 📋 Prérequis

- Docker et Docker Compose
- VM avec au minimum 1 Go de RAM et 8 Go de stockage

## 🛠️ Installation et Déploiement

### 1. Cloner le projet

```bash
git clone <repository-url>
cd order-management-app
```

### 2. Configuration

Les identifiants par défaut sont :
- **Utilisateur** : `admin`
- **Mot de passe** : `admin123`

Pour modifier ces identifiants, éditez le fichier `docker-compose.yml` :

```yaml
environment:
  - ADMIN_USERNAME=votre_nom_utilisateur
  - ADMIN_PASSWORD=votre_mot_de_passe
```

### 3. Déploiement avec Docker

```bash
# Construire et démarrer l'application
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter l'application
docker-compose down
```

### 4. Accès à l'application

- **Interface utilisateur** : http://localhost:3000
- **Administration** : http://localhost:3000/admin/login
- **Récapitulatif des commandes** : http://localhost:3000/admin/orders

## 📁 Structure du Projet

```
order-management-app/
├── server.js              # Serveur Node.js principal
├── package.json          # Dépendances npm
├── Dockerfile           # Image Docker
├── docker-compose.yml   # Configuration Docker Compose
├── data/               # Dossier pour la base SQLite (créé automatiquement)
└── public/            # Fichiers statiques
    ├── index.html     # Page de commande
    ├── login.html     # Page de connexion admin
    ├── admin.html     # Gestion des produits
    └── orders.html    # Récapitulatif des commandes
```

## 🗃️ Base de Données

### Tables

**products**
- `id` : Identifiant unique
- `name` : Nom du produit
- `price` : Prix en francs pacifique (XPF)
- `created_at` : Date de création

**orders**
- `id` : Numéro de commande
- `customer_name` : Nom du client
- `total_amount` : Montant total
- `is_paid` : Statut de paiement (0=non payé, 1=payé)
- `created_at` : Date de commande

**order_items**
- `id` : Identifiant de l'article
- `order_id` : Référence à la commande
- `product_id` : Référence au produit
- `quantity` : Quantité commandée
**order_items**
- `id` : Identifiant de l'article
- `order_id` : Référence à la commande
- `product_id` : Référence au produit
- `quantity` : Quantité commandée
- `unit_price` : Prix unitaire en XPF au moment de la commande

**system_settings**
- `key` : Clé du paramètre (ex: 'orders_enabled', 'menu_link')
- `value` : Valeur du paramètre ('true'/'false' pour orders_enabled, URL pour menu_link)
- `updated_at` : Date de dernière modification

## 🔒 Sécurité

- **Authentification par session** pour l'administration
- **Validation des données** côté serveur
- **Protection CSRF** avec sessions sécurisées
- **Sanitisation des entrées** utilisateur

## 📊 API Endpoints

### Publics
- `GET /` - Page de commande
- `GET /api/products` - Liste des produits
- `GET /api/system-settings` - Statut des commandes et lien menu
- `POST /api/orders` - Créer une commande (si activé)

### Protégés (Authentification requise)
- `POST /api/login` - Connexion admin
- `POST /api/logout` - Déconnexion
- `POST /api/products` - Ajouter un produit
- `DELETE /api/products/:id` - Supprimer un produit
- `GET /api/orders` - Liste des commandes
- `PUT /api/orders/:id/payment` - Modifier le statut de paiement d'une commande
- `DELETE /api/orders/reset` - Supprimer toutes les commandes (réinitialisation)
- `GET /api/product-stats` - Statistiques des produits vendus
- `PUT /api/system-settings/orders-enabled` - Activer/désactiver les commandes
- `PUT /api/system-settings/menu-link` - Modifier le lien du menu

## 🚀 Optimisations pour VM 1Go RAM

- **Image Alpine Linux** : Base Docker légère
- **Limites de mémoire** : 512Mo max, 256Mo réservés
- **SQLite** : Base de données sans daemon
- **Session storage** : Stockage en mémoire
- **Compression des assets** : CSS/JS optimisés

## 🔧 Maintenance

### Sauvegarde de la base de données

```bash
# Copier la base depuis le conteneur
docker cp order-management-app_order-app_1:/data/orders.db ./backup/

# Restaurer une sauvegarde
docker cp ./backup/orders.db order-management-app_order-app_1:/data/
```

### Logs et Monitoring

```bash
# Voir les logs en temps réel
docker-compose logs -f order-app

# Statistiques des conteneurs
docker stats
```

## 🎨 Personnalisation

### Modifier les produits par défaut

Éditez la fonction `initDatabase()` dans `server.js` :

```javascript
const defaultProducts = [
    ['Chicken katsu bowl', 950],
    ['Chiken katsu noodles bowl', 950],
    ['Poke bowl (Thon frais)', 1050],
    ['Poke wasabi bowl', 1100],
    ['Duo poke bowl', 1250],
    ['Mini poisson cru chinois', 700],
    ['Mini poisson cru lait de coco', 700],
    ['Mini riz', 200],
    ['Indian butter chiken + riz', 950],
    ['Katsu burger + frites à la japonaise', 1000],
    ['Katsu curry burger + frites', 1100],
    ['Ninja katsu burger + frites à la japonaise', 1050],
    ['Fish burger (thon) + frites à la japonaise', 1050],
    ['Samurai katsu burger + frites à la japonaise', 1050],
    ['Bento du jour', 1450]
];
```

### Changer le thème

Modifiez les gradients CSS dans les fichiers HTML :

```css
background: linear-gradient(135deg, #votre-couleur1 0%, #votre-couleur2 100%);
```

## 🐳 Variables d'Environnement

| Variable | Description | Défaut |
|----------|-------------|---------|
| `NODE_ENV` | Environnement | `production` |
| `PORT` | Port d'écoute | `3000` |
| `DB_PATH` | Chemin base de données | `/data/orders.db` |
| `ADMIN_USERNAME` | Nom d'utilisateur admin | `admin` |
| `ADMIN_PASSWORD` | Mot de passe admin | `admin123` |

## 🤝 Support

Pour toute question ou problème :
1. Vérifiez les logs : `docker-compose logs -f`
2. Redémarrez l'application : `docker-compose restart`
3. Reconstruisez l'image : `docker-compose up --build -d`

---

**Note** : Cette application est prête pour la production sur une VM de 1Go RAM et 8Go de stockage. La base de données grandit automatiquement selon l'usage.