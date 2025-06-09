const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/orders.db';

// Créer le dossier data s'il n'existe pas
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Configuration middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'order-management-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 heures
}));

// Initialisation de la base de données
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erreur lors de l\'ouverture de la base de données:', err);
    } else {
        console.log('Connecté à la base de données SQLite');
        initDatabase();
    }
});

function initDatabase() {
    // Créer les tables
    db.serialize(() => {
        // Table des produits
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table des commandes
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            total_amount REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Table des éléments de commande
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price REAL NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )`);

        // Insérer quelques produits par défaut
        db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
            if (row.count === 0) {
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

                const stmt = db.prepare("INSERT INTO products (name, price) VALUES (?, ?)");
                defaultProducts.forEach(product => {
                    stmt.run(product);
                });
                stmt.finalize();
            }
        });
    });
}

// Middleware d'authentification
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.redirect('/admin/login');
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/admin', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/orders', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'orders.html'));
});

// API Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === adminUsername && password === adminPassword) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/products', (req, res) => {
    db.all("SELECT * FROM products ORDER BY name", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.post('/api/products', requireAuth, (req, res) => {
    const { name, price } = req.body;
    
    if (!name || !price) {
        return res.status(400).json({ error: 'Nom et prix requis' });
    }
    
    db.run("INSERT INTO products (name, price) VALUES (?, ?)", [name, parseInt(price)], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ id: this.lastID, name, price: parseInt(price) });
        }
    });
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
    const id = req.params.id;
    
    db.run("DELETE FROM products WHERE id = ?", [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ success: true, changes: this.changes });
        }
    });
});

app.post('/api/orders', (req, res) => {
    const { customerName, customerEmail, items } = req.body;
    
    if (!customerName || !items || items.length === 0) {
        return res.status(400).json({ error: 'Nom du client et articles requis' });
    }
    
    // Calculer le montant total
    let totalAmount = 0;
    const productIds = items.map(item => item.productId);
    
    db.all("SELECT id, price FROM products WHERE id IN (" + productIds.map(() => '?').join(',') + ")", productIds, (err, products) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        
        // Créer un map des prix
        const priceMap = {};
        products.forEach(product => {
            priceMap[product.id] = product.price;
        });
        
        // Calculer le total
        items.forEach(item => {
            if (priceMap[item.productId]) {
                totalAmount += priceMap[item.productId] * item.quantity;
            }
        });
        
        // Insérer la commande
        db.run("INSERT INTO orders (customer_name, customer_email, total_amount) VALUES (?, ?, ?)", 
               [customerName, customerEmail, totalAmount], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            const orderId = this.lastID;
            
            // Insérer les articles de la commande
            const stmt = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)");
            
            items.forEach(item => {
                if (priceMap[item.productId]) {
                    stmt.run([orderId, item.productId, item.quantity, priceMap[item.productId]]);
                }
            });
            
            stmt.finalize((err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.json({ success: true, orderId, totalAmount });
                }
            });
        });
    });
});

app.get('/api/orders', requireAuth, (req, res) => {
    const query = `
        SELECT 
            o.id,
            o.customer_name,
            o.customer_email,
            o.total_amount,
            o.created_at,
            GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')') as items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

app.get('/api/product-stats', requireAuth, (req, res) => {
    const query = `
        SELECT 
            p.id,
            p.name,
            SUM(oi.quantity) as total_quantity,
            COUNT(DISTINCT oi.order_id) as order_count,
            SUM(oi.quantity * oi.unit_price) as total_revenue
        FROM products p
        INNER JOIN order_items oi ON p.id = oi.product_id
        GROUP BY p.id, p.name
        ORDER BY total_quantity DESC
    `;
    
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Gestion des erreurs et arrêt propre
process.on('SIGINT', () => {
    console.log('\nFermeture de la base de données...');
    db.close((err) => {
        if (err) {
            console.error(err.message);
        } else {
            console.log('Base de données fermée.');
        }
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});