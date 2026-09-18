const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const db = require('./config/db'); // MySQL pool
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOADS_DIR = path.join(__dirname, 'assets', 'uploads');

// ─── Ensure uploads dir exists ───────────────────────────
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ─── Multer for image uploads ─────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ok = allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase());
        cb(ok ? null : new Error('Only image files allowed!'), ok);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));            // serve index.html + assets
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/assets/uploads', express.static(UPLOADS_DIR));

// ─── Helpers ──────────────────────────────────────────────
function genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════
app.post('/api/auth/login', async (req, res) => {
    try {
        const { password } = req.body;
        const [rows] = await db.query('SELECT adminPassword FROM settings WHERE id = 1');
        if (rows.length > 0 && password === rows[0].adminPassword) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Wrong password' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════════════════════════
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM products ORDER BY createdAt DESC');
        // Convert tinyint(1) to boolean for frontend compatibility, and price to float
        const products = rows.map(p => ({ ...p, inStock: !!p.inStock, price: parseFloat(p.price) }));
        res.json(products);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const { name, price, category, size, badge, inStock, imageUrl } = req.body;
        const image = req.file ? `/assets/uploads/${req.file.filename}` : (imageUrl || '');
        const product = {
            id: genId('p'),
            name,
            price: parseFloat(price),
            category: category || 'men',
            size: size || 'M',
            image,
            badge: badge || '',
            inStock: inStock === 'true' || inStock === true,
            createdAt: new Date().toISOString()
        };
        await db.query(
            'INSERT INTO products (id, name, price, category, size, image, badge, inStock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [product.id, product.name, product.price, product.category, product.size, product.image, product.badge, product.inStock, product.createdAt]
        );
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id;
        const { name, price, category, size, badge, inStock, imageUrl } = req.body;

        let updates = [];
        let values = [];

        if (req.file) { updates.push('image = ?'); values.push(`/assets/uploads/${req.file.filename}`); }
        else if (imageUrl) { updates.push('image = ?'); values.push(imageUrl); }

        if (name) { updates.push('name = ?'); values.push(name); }
        if (price) { updates.push('price = ?'); values.push(parseFloat(price)); }
        if (category) { updates.push('category = ?'); values.push(category); }
        if (size) { updates.push('size = ?'); values.push(size); }
        if (badge !== undefined) { updates.push('badge = ?'); values.push(badge); }
        if (inStock !== undefined) { updates.push('inStock = ?'); values.push(inStock === 'true' || inStock === true); }

        if (updates.length > 0) {
            values.push(id);
            await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });

        const product = { ...rows[0], inStock: !!rows[0].inStock };
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  GIFT BOXES
// ════════════════════════════════════════════════════════════
app.get('/api/giftboxes', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM gift_boxes ORDER BY createdAt DESC');
        res.json(rows.map(g => ({ ...g, inStock: !!g.inStock, price: parseFloat(g.price) })));
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/giftboxes', upload.single('image'), async (req, res) => {
    try {
        const { name, price, description, badge, inStock, imageUrl } = req.body;
        const image = req.file ? `/assets/uploads/${req.file.filename}` : (imageUrl || '');
        const gift = {
            id: genId('g'),
            name,
            price: parseFloat(price),
            description: description || '',
            image,
            badge: badge || '',
            inStock: inStock === 'true' || inStock === true,
            createdAt: new Date().toISOString()
        };
        await db.query(
            'INSERT INTO gift_boxes (id, name, price, description, image, badge, inStock, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [gift.id, gift.name, gift.price, gift.description, gift.image, gift.badge, gift.inStock, gift.createdAt]
        );
        res.json({ success: true, gift });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/giftboxes/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id;
        const { name, price, description, badge, inStock, imageUrl } = req.body;

        let updates = [];
        let values = [];

        if (req.file) { updates.push('image = ?'); values.push(`/assets/uploads/${req.file.filename}`); }
        else if (imageUrl) { updates.push('image = ?'); values.push(imageUrl); }

        if (name) { updates.push('name = ?'); values.push(name); }
        if (price) { updates.push('price = ?'); values.push(parseFloat(price)); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (badge !== undefined) { updates.push('badge = ?'); values.push(badge); }
        if (inStock !== undefined) { updates.push('inStock = ?'); values.push(inStock === 'true' || inStock === true); }

        if (updates.length > 0) {
            values.push(id);
            await db.query(`UPDATE gift_boxes SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [rows] = await db.query('SELECT * FROM gift_boxes WHERE id = ?', [id]);
        res.json({ success: true, gift: { ...rows[0], inStock: !!rows[0].inStock } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/giftboxes/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM gift_boxes WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  ACCESSORIES
// ════════════════════════════════════════════════════════════
app.get('/api/accessories', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM accessories ORDER BY createdAt DESC');
        res.json(rows.map(a => ({ ...a, inStock: !!a.inStock, price: parseFloat(a.price) })));
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/accessories', upload.single('image'), async (req, res) => {
    try {
        const { name, price, inStock, imageUrl } = req.body;
        const image = req.file ? `/assets/uploads/${req.file.filename}` : (imageUrl || '');
        const acc = {
            id: genId('a'),
            name,
            price: parseFloat(price),
            image,
            inStock: inStock === 'true' || inStock === true,
            createdAt: new Date().toISOString()
        };
        await db.query(
            'INSERT INTO accessories (id, name, price, image, inStock, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
            [acc.id, acc.name, acc.price, acc.image, acc.inStock, acc.createdAt]
        );
        res.json({ success: true, accessory: acc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/accessories/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id;
        const { name, price, inStock, imageUrl } = req.body;

        let updates = [];
        let values = [];

        if (req.file) { updates.push('image = ?'); values.push(`/assets/uploads/${req.file.filename}`); }
        else if (imageUrl) { updates.push('image = ?'); values.push(imageUrl); }

        if (name) { updates.push('name = ?'); values.push(name); }
        if (price) { updates.push('price = ?'); values.push(parseFloat(price)); }
        if (inStock !== undefined) { updates.push('inStock = ?'); values.push(inStock === 'true' || inStock === true); }

        if (updates.length > 0) {
            values.push(id);
            await db.query(`UPDATE accessories SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [rows] = await db.query('SELECT * FROM accessories WHERE id = ?', [id]);
        res.json({ success: true, accessory: { ...rows[0], inStock: !!rows[0].inStock } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/accessories/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM accessories WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  EMPLOYEES
// ════════════════════════════════════════════════════════════
app.get('/api/employees', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM employees ORDER BY createdAt DESC');
        res.json(rows.map(e => ({ ...e, salary: parseFloat(e.salary) })));
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/employees', upload.single('image'), async (req, res) => {
    try {
        const { name, position, phone, email, salary, imageUrl } = req.body;
        const image = req.file ? `/assets/uploads/${req.file.filename}` : (imageUrl || '');
        const emp = {
            id: genId('emp'),
            name,
            position,
            phone: phone || '',
            email: email || '',
            salary: parseFloat(salary) || 0,
            imageUrl: image,
            createdAt: new Date().toISOString()
        };
        await db.query(
            'INSERT INTO employees (id, name, position, phone, email, salary, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [emp.id, emp.name, emp.position, emp.phone, emp.email, emp.salary, emp.imageUrl, emp.createdAt]
        );
        res.json({ success: true, employee: emp });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/employees/:id', upload.single('image'), async (req, res) => {
    try {
        const id = req.params.id;
        const { name, position, phone, email, salary, imageUrl } = req.body;

        let updates = [];
        let values = [];

        if (req.file) { updates.push('imageUrl = ?'); values.push(`/assets/uploads/${req.file.filename}`); }
        else if (imageUrl) { updates.push('imageUrl = ?'); values.push(imageUrl); }

        if (name) { updates.push('name = ?'); values.push(name); }
        if (position) { updates.push('position = ?'); values.push(position); }
        if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); values.push(email); }
        if (salary !== undefined) { updates.push('salary = ?'); values.push(parseFloat(salary) || 0); }

        if (updates.length > 0) {
            values.push(id);
            await db.query(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [id]);
        res.json({ success: true, employee: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/employees/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════
app.get('/api/orders', async (req, res) => {
    try {
        const [orders] = await db.query('SELECT * FROM orders ORDER BY createdAt DESC');
        const [items] = await db.query('SELECT * FROM order_items');

        // Map items to their orders
        const fullOrders = orders.map(o => {
            return {
                id: o.id,
                customer: { name: o.customer_name, phone: o.customer_phone, address: o.customer_address },
                total: parseFloat(o.total),
                paymentMethod: o.paymentMethod,
                transactionRef: o.transactionRef,
                status: o.status,
                createdAt: o.createdAt,
                items: items.filter(i => i.order_id === o.id).map(i => ({
                    name: i.name, size: i.size, qty: i.qty, price: parseFloat(i.price)
                }))
            };
        });
        res.json(fullOrders);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const id = genId('ord');
        const { customer, items, total, paymentMethod, transactionRef } = req.body;

        await conn.query(
            'INSERT INTO orders (id, customer_name, customer_phone, customer_address, total, paymentMethod, transactionRef, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, customer.name, customer.phone, customer.address, total, paymentMethod, transactionRef, 'pending', new Date().toISOString()]
        );

        if (items && items.length > 0) {
            for (let i of items) {
                await conn.query(
                    'INSERT INTO order_items (order_id, name, size, qty, price) VALUES (?, ?, ?, ?, ?)',
                    [id, i.name, i.size, i.qty, i.price]
                );
            }
        }
        await conn.commit();
        res.json({ success: true, order: { id, customer, items, total, paymentMethod, transactionRef, status: 'pending' } });
    } catch (err) {
        await conn.rollback();
        res.status(500).json({ success: false, message: err.message });
    } finally {
        conn.release();
    }
});

app.put('/api/orders/:id/status', async (req, res) => {
    try {
        await db.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM orders WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
app.get('/api/settings', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT storeName, currency, heroTitle, heroSubtitle FROM settings WHERE id = 1');
        res.json(rows[0] || {});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/settings', async (req, res) => {
    try {
        const { storeName, currency, heroTitle, heroSubtitle, adminPassword } = req.body;
        let updates = [];
        let values = [];

        if (storeName) { updates.push('storeName = ?'); values.push(storeName); }
        if (currency) { updates.push('currency = ?'); values.push(currency); }
        if (heroTitle) { updates.push('heroTitle = ?'); values.push(heroTitle); }
        if (heroSubtitle) { updates.push('heroSubtitle = ?'); values.push(heroSubtitle); }
        if (adminPassword) { updates.push('adminPassword = ?'); values.push(adminPassword); }

        if (updates.length > 0) {
            values.push(1); // id = 1
            await db.query(`UPDATE settings SET ${updates.join(', ')} WHERE id = ?`, values);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Image upload standalone ─────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    res.json({ success: true, url: `/assets/uploads/${req.file.filename}` });
});

// ─── Stats ───────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        const [prodCount] = await db.query('SELECT COUNT(*) as count FROM products');
        const [giftCount] = await db.query('SELECT COUNT(*) as count FROM gift_boxes');
        const [accCount] = await db.query('SELECT COUNT(*) as count FROM accessories');
        const [orderCount] = await db.query('SELECT COUNT(*) as count FROM orders');
        const [pendingCount] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'");
        const [completedCount] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'");
        const [revenue] = await db.query("SELECT SUM(total) as sum FROM orders WHERE status != 'cancelled'");

        res.json({
            totalProducts: prodCount[0].count,
            totalGiftBoxes: giftCount[0].count,
            totalAccessories: accCount[0].count,
            totalOrders: orderCount[0].count,
            pendingOrders: pendingCount[0].count,
            completedOrders: completedCount[0].count,
            totalRevenue: (revenue[0].sum || 0).toFixed(2)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  ThreadBox Server running at → http://localhost:${PORT}`);
    console.log(`🔑  Admin Panel             → http://localhost:${PORT}/admin`);
    console.log(`📦  API Base URL            → http://localhost:${PORT}/api\n`);
});
