const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
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

// ─── DB helpers ───────────────────────────────────────────
function readDB() {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}
function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}
function genId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// ════════════════════════════════════════════════════════════
//  AUTH  (simple password check)
// ════════════════════════════════════════════════════════════
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    const db = readDB();
    if (password === db.settings.adminPassword) {
        res.json({ success: true, message: 'Login successful' });
    } else {
        res.status(401).json({ success: false, message: 'Wrong password' });
    }
});

// ════════════════════════════════════════════════════════════
//  PRODUCTS  (/api/products)
// ════════════════════════════════════════════════════════════
app.get('/api/products', (req, res) => {
    const db = readDB();
    res.json(db.products);
});

app.post('/api/products', upload.single('image'), (req, res) => {
    try {
        const db = readDB();
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
        db.products.push(product);
        writeDB(db);
        res.json({ success: true, product });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/products/:id', upload.single('image'), (req, res) => {
    try {
        const db = readDB();
        const idx = db.products.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found' });
        const { name, price, category, size, badge, inStock, imageUrl } = req.body;
        if (req.file) db.products[idx].image = `/assets/uploads/${req.file.filename}`;
        else if (imageUrl) db.products[idx].image = imageUrl;
        if (name) db.products[idx].name = name;
        if (price) db.products[idx].price = parseFloat(price);
        if (category) db.products[idx].category = category;
        if (size) db.products[idx].size = size;
        if (badge !== undefined) db.products[idx].badge = badge;
        if (inStock !== undefined) db.products[idx].inStock = inStock === 'true' || inStock === true;
        writeDB(db);
        res.json({ success: true, product: db.products[idx] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/products/:id', (req, res) => {
    try {
        const db = readDB();
        const idx = db.products.findIndex(p => p.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Product not found' });
        db.products.splice(idx, 1);
        writeDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  GIFT BOXES  (/api/giftboxes)
// ════════════════════════════════════════════════════════════
app.get('/api/giftboxes', (req, res) => {
    const db = readDB();
    res.json(db.giftBoxes);
});

app.post('/api/giftboxes', upload.single('image'), (req, res) => {
    try {
        const db = readDB();
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
        db.giftBoxes.push(gift);
        writeDB(db);
        res.json({ success: true, gift });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/giftboxes/:id', upload.single('image'), (req, res) => {
    try {
        const db = readDB();
        const idx = db.giftBoxes.findIndex(g => g.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Gift box not found' });
        const { name, price, description, badge, inStock, imageUrl } = req.body;
        if (req.file) db.giftBoxes[idx].image = `/assets/uploads/${req.file.filename}`;
        else if (imageUrl) db.giftBoxes[idx].image = imageUrl;
        if (name) db.giftBoxes[idx].name = name;
        if (price) db.giftBoxes[idx].price = parseFloat(price);
        if (description !== undefined) db.giftBoxes[idx].description = description;
        if (badge !== undefined) db.giftBoxes[idx].badge = badge;
        if (inStock !== undefined) db.giftBoxes[idx].inStock = inStock === 'true' || inStock === true;
        writeDB(db);
        res.json({ success: true, gift: db.giftBoxes[idx] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/giftboxes/:id', (req, res) => {
    try {
        const db = readDB();
        const idx = db.giftBoxes.findIndex(g => g.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Gift box not found' });
        db.giftBoxes.splice(idx, 1);
        writeDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  ACCESSORIES  (/api/accessories)
// ════════════════════════════════════════════════════════════
app.get('/api/accessories', (req, res) => {
    const db = readDB();
    res.json(db.accessories);
});

app.post('/api/accessories', upload.single('image'), (req, res) => {
    try {
        const db = readDB();
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
        db.accessories.push(acc);
        writeDB(db);
        res.json({ success: true, accessory: acc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/accessories/:id', upload.single('image'), (req, res) => {
    try {
        const db = readDB();
        const idx = db.accessories.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Accessory not found' });
        const { name, price, inStock, imageUrl } = req.body;
        if (req.file) db.accessories[idx].image = `/assets/uploads/${req.file.filename}`;
        else if (imageUrl) db.accessories[idx].image = imageUrl;
        if (name) db.accessories[idx].name = name;
        if (price) db.accessories[idx].price = parseFloat(price);
        if (inStock !== undefined) db.accessories[idx].inStock = inStock === 'true' || inStock === true;
        writeDB(db);
        res.json({ success: true, accessory: db.accessories[idx] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/accessories/:id', (req, res) => {
    try {
        const db = readDB();
        const idx = db.accessories.findIndex(a => a.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Accessory not found' });
        db.accessories.splice(idx, 1);
        writeDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  ORDERS  (/api/orders)
// ════════════════════════════════════════════════════════════
app.get('/api/orders', (req, res) => {
    const db = readDB();
    res.json(db.orders);
});

app.post('/api/orders', (req, res) => {
    try {
        const db = readDB();
        const order = {
            id: genId('ord'),
            ...req.body,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        db.orders.unshift(order);
        writeDB(db);
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/orders/:id/status', (req, res) => {
    try {
        const db = readDB();
        const idx = db.orders.findIndex(o => o.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });
        db.orders[idx].status = req.body.status;
        writeDB(db);
        res.json({ success: true, order: db.orders[idx] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        const db = readDB();
        const idx = db.orders.findIndex(o => o.id === req.params.id);
        if (idx === -1) return res.status(404).json({ success: false, message: 'Order not found' });
        db.orders.splice(idx, 1);
        writeDB(db);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ════════════════════════════════════════════════════════════
//  SETTINGS  (/api/settings)
// ════════════════════════════════════════════════════════════
app.get('/api/settings', (req, res) => {
    const db = readDB();
    const safe = { ...db.settings };
    delete safe.adminPassword;
    res.json(safe);
});

app.put('/api/settings', (req, res) => {
    try {
        const db = readDB();
        const { storeName, currency, heroTitle, heroSubtitle, adminPassword } = req.body;
        if (storeName) db.settings.storeName = storeName;
        if (currency) db.settings.currency = currency;
        if (heroTitle) db.settings.heroTitle = heroTitle;
        if (heroSubtitle) db.settings.heroSubtitle = heroSubtitle;
        if (adminPassword) db.settings.adminPassword = adminPassword;
        writeDB(db);
        res.json({ success: true, settings: db.settings });
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
app.get('/api/stats', (req, res) => {
    const db = readDB();
    const totalRevenue = db.orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    res.json({
        totalProducts: db.products.length,
        totalGiftBoxes: db.giftBoxes.length,
        totalAccessories: db.accessories.length,
        totalOrders: db.orders.length,
        pendingOrders: db.orders.filter(o => o.status === 'pending').length,
        completedOrders: db.orders.filter(o => o.status === 'completed').length,
        totalRevenue: totalRevenue.toFixed(2)
    });
});

// ─── Start ────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n✅  ThreadBox Server running at → http://localhost:${PORT}`);
    console.log(`🔑  Admin Panel             → http://localhost:${PORT}/admin`);
    console.log(`📦  API Base URL            → http://localhost:${PORT}/api\n`);
});
