const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_PATH = path.join(__dirname, '../data', 'db.json');

async function runMigration() {
    console.log('🚀 Starting Database Migration...');

    // Connect without database selected to create it
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || ''
    });

    try {
        console.log('📦 Creating database `threadbox` if not exists...');
        await connection.query('CREATE DATABASE IF NOT EXISTS threadbox');
        await connection.query('USE threadbox');

        console.log('🛠️ Creating tables...');

        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                category VARCHAR(100),
                size VARCHAR(50),
                image VARCHAR(255),
                badge VARCHAR(50),
                inStock BOOLEAN DEFAULT true,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS gift_boxes (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                badge VARCHAR(50),
                inStock BOOLEAN DEFAULT true,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS accessories (
                id VARCHAR(100) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                image VARCHAR(255),
                inStock BOOLEAN DEFAULT true,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id VARCHAR(100) PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50),
                customer_address TEXT,
                total DECIMAL(10,2) DEFAULT 0.00,
                paymentMethod VARCHAR(50),
                transactionRef VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(100) NOT NULL,
                name VARCHAR(255) NOT NULL,
                size VARCHAR(50),
                qty INT DEFAULT 1,
                price DECIMAL(10,2) NOT NULL,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT PRIMARY KEY,
                storeName VARCHAR(255),
                currency VARCHAR(10),
                heroTitle VARCHAR(255),
                heroSubtitle TEXT,
                adminPassword VARCHAR(255)
            )
        `);

        console.log('✅ Tables created.');

        // Seeding Data
        console.log('📥 Importing data from db.json...');
        if (fs.existsSync(DB_PATH)) {
            const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

            // Products
            if (dbData.products && dbData.products.length > 0) {
                for (let p of dbData.products) {
                    await connection.query(
                        'INSERT IGNORE INTO products (id, name, price, category, size, image, badge, inStock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [p.id, p.name, p.price, p.category, p.size, p.image, p.badge, p.inStock, new Date(p.createdAt)]
                    );
                }
            }

            // GiftBoxes
            if (dbData.giftBoxes && dbData.giftBoxes.length > 0) {
                for (let g of dbData.giftBoxes) {
                    await connection.query(
                        'INSERT IGNORE INTO gift_boxes (id, name, price, description, image, badge, inStock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [g.id, g.name, g.price, g.description, g.image, g.badge, g.inStock, new Date(g.createdAt)]
                    );
                }
            }

            // Accessories
            if (dbData.accessories && dbData.accessories.length > 0) {
                for (let a of dbData.accessories) {
                    await connection.query(
                        'INSERT IGNORE INTO accessories (id, name, price, image, inStock, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                        [a.id, a.name, a.price, a.image, a.inStock, new Date(a.createdAt)]
                    );
                }
            }

            // Orders
            if (dbData.orders && dbData.orders.length > 0) {
                for (let o of dbData.orders) {
                    await connection.query(
                        'INSERT IGNORE INTO orders (id, customer_name, customer_phone, customer_address, total, paymentMethod, transactionRef, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [o.id, o.customer.name, o.customer.phone, o.customer.address, o.total, o.paymentMethod, o.transactionRef, o.status, new Date(o.createdAt)]
                    );
                    if (o.items && o.items.length > 0) {
                        for (let i of o.items) {
                            await connection.query(
                                'INSERT IGNORE INTO order_items (order_id, name, size, qty, price) VALUES (?, ?, ?, ?, ?)',
                                [o.id, i.name, i.size, i.qty, i.price]
                            );
                        }
                    }
                }
            }

            // Settings
            if (dbData.settings) {
                await connection.query(
                    'INSERT IGNORE INTO settings (id, storeName, currency, heroTitle, heroSubtitle, adminPassword) VALUES (1, ?, ?, ?, ?, ?)',
                    [dbData.settings.storeName, dbData.settings.currency, dbData.settings.heroTitle, dbData.settings.heroSubtitle, dbData.settings.adminPassword]
                );
            }

            console.log('🎉 Data imported successfully.');
        } else {
            console.warn('⚠️ db.json not found, skipping data import.');
        }

    } catch (err) {
        console.error('❌ Migration Error:', err);
    } finally {
        await connection.end();
        console.log('👋 Migration finished.');
    }
}

runMigration();
