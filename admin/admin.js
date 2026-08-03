/* ═════════════════════════════════════════════════
   ThreadBox Admin Panel — JavaScript
═════════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';
let isLoggedIn = false;
let deleteCallback = null;

// ════════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════════
function showToast(message, type = 'info') {
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon"></i><span>${message}</span>`;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(30px)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    try {
        const res = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw })
        });
        const data = await res.json();
        if (data.success) {
            isLoggedIn = true;
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('admin-app').classList.remove('hidden');
            document.body.classList.remove('login-page');
            loadAll();
            showToast('Login successful! Welcome Admin 👋', 'success');
        } else {
            errEl.textContent = '❌ ' + data.message;
        }
    } catch {
        errEl.textContent = '❌ Cannot connect to server. Is it running?';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    isLoggedIn = false;
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('admin-app').classList.add('hidden');
    document.body.classList.add('login-page');
    document.getElementById('login-password').value = '';
});

// ════════════════════════════════════════════════════════════
//  NAVIGATION
// ════════════════════════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
        const target = document.getElementById(`page-${page}`);
        target.classList.add('active');
        target.classList.remove('hidden');
        document.getElementById('page-title').textContent = item.textContent.trim();
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('open');
        }
    });
});

document.getElementById('menu-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ════════════════════════════════════════════════════════════
//  LOAD ALL
// ════════════════════════════════════════════════════════════
async function loadAll() {
    loadStats();
    loadProducts();
    loadGiftBoxes();
    loadAccessories();
    loadOrders();
    loadSettings();
}

// ─── Stats ───────────────────────────────────────────────
async function loadStats() {
    try {
        const res = await fetch(`${API}/stats`);
        const s = await res.json();
        document.getElementById('stat-products').textContent = s.totalProducts;
        document.getElementById('stat-gifts').textContent = s.totalGiftBoxes;
        document.getElementById('stat-accessories').textContent = s.totalAccessories;
        document.getElementById('stat-orders').textContent = s.totalOrders;
        document.getElementById('stat-pending').textContent = s.pendingOrders;
        document.getElementById('stat-revenue').textContent = '৳' + s.totalRevenue;
    } catch { /* silent */ }
}

// ════════════════════════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════════════════════════
async function loadProducts() {
    try {
        const res = await fetch(`${API}/products`);
        const products = await res.json();
        document.getElementById('products-count').textContent = products.length;
        const grid = document.getElementById('products-grid');
        if (!products.length) {
            grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-shirt"></i><p>No products yet. Click "Add Product" to start!</p></div>`;
            return;
        }
        grid.innerHTML = products.map(p => `
            <div class="item-card">
                <div class="item-card-img">
                    <img src="${p.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    ${p.badge ? `<span class="item-badge">${p.badge}</span>` : ''}
                    ${!p.inStock ? `<span class="out-of-stock-badge">Out of Stock</span>` : ''}
                </div>
                <div class="item-card-body">
                    <h4>${p.name}</h4>
                    <div class="item-meta">
                        <span class="item-price">৳${p.price.toFixed(2)}</span>
                        <span class="item-size-tag">Size ${p.size}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="editProduct('${p.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn-delete" onclick="askDelete('product','${p.id}','${p.name}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch { showToast('Failed to load products', 'error'); }
}

// Product form
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('p-name').value);
    formData.append('price', document.getElementById('p-price').value);
    formData.append('size', document.getElementById('p-size').value);
    formData.append('badge', document.getElementById('p-badge').value);
    formData.append('inStock', document.getElementById('p-inStock').checked);
    formData.append('category', 'men');
    const imageUrl = document.getElementById('p-imageUrl').value;
    const imageFile = document.getElementById('p-image').files[0];
    if (imageFile) formData.append('image', imageFile);
    else if (imageUrl) formData.append('imageUrl', imageUrl);

    const url = id ? `${API}/products/${id}` : `${API}/products`;
    const method = id ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, { method, body: formData });
        const data = await res.json();
        if (data.success) {
            showToast(id ? 'Product updated!' : 'Product added!', 'success');
            closeModal('product');
            loadProducts();
            loadStats();
        } else {
            showToast(data.message || 'Error saving product', 'error');
        }
    } catch { showToast('Server error', 'error'); }
});

async function editProduct(id) {
    try {
        const res = await fetch(`${API}/products`);
        const products = await res.json();
        const p = products.find(x => x.id === id);
        if (!p) return;
        document.getElementById('product-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-price').value = p.price;
        document.getElementById('p-size').value = p.size;
        document.getElementById('p-badge').value = p.badge || '';
        document.getElementById('p-inStock').checked = p.inStock;
        document.getElementById('p-imageUrl').value = typeof p.image === 'string' && p.image.startsWith('http') ? p.image : '';
        const prev = document.getElementById('p-img-preview');
        prev.innerHTML = p.image ? `<img src="${p.image}" alt="preview">` : '';
        document.getElementById('modal-product-title').textContent = 'Edit Product';
        document.getElementById('product-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        openModal('product');
    } catch { showToast('Failed to load product', 'error'); }
}

// ════════════════════════════════════════════════════════════
//  GIFT BOXES
// ════════════════════════════════════════════════════════════
async function loadGiftBoxes() {
    try {
        const res = await fetch(`${API}/giftboxes`);
        const gifts = await res.json();
        document.getElementById('giftboxes-count').textContent = gifts.length;
        const grid = document.getElementById('giftboxes-grid');
        if (!gifts.length) {
            grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-gift"></i><p>No gift boxes yet.</p></div>`;
            return;
        }
        grid.innerHTML = gifts.map(g => `
            <div class="item-card">
                <div class="item-card-img">
                    <img src="${g.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${g.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    ${g.badge ? `<span class="item-badge">${g.badge}</span>` : ''}
                </div>
                <div class="item-card-body">
                    <h4>${g.name}</h4>
                    <div class="item-meta">
                        <span class="item-price">৳${g.price.toFixed(2)}</span>
                    </div>
                    <p class="item-desc">${g.description || ''}</p>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="editGiftBox('${g.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn-delete" onclick="askDelete('giftbox','${g.id}','${g.name}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch { showToast('Failed to load gift boxes', 'error'); }
}

document.getElementById('giftbox-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('giftbox-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('g-name').value);
    formData.append('price', document.getElementById('g-price').value);
    formData.append('description', document.getElementById('g-description').value);
    formData.append('badge', document.getElementById('g-badge').value);
    formData.append('inStock', document.getElementById('g-inStock').checked);
    const imageUrl = document.getElementById('g-imageUrl').value;
    const imageFile = document.getElementById('g-image').files[0];
    if (imageFile) formData.append('image', imageFile);
    else if (imageUrl) formData.append('imageUrl', imageUrl);
    const url = id ? `${API}/giftboxes/${id}` : `${API}/giftboxes`;
    const method = id ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, { method, body: formData });
        const data = await res.json();
        if (data.success) {
            showToast(id ? 'Gift box updated!' : 'Gift box added!', 'success');
            closeModal('giftbox');
            loadGiftBoxes();
            loadStats();
        } else { showToast(data.message || 'Error', 'error'); }
    } catch { showToast('Server error', 'error'); }
});

async function editGiftBox(id) {
    try {
        const res = await fetch(`${API}/giftboxes`);
        const gifts = await res.json();
        const g = gifts.find(x => x.id === id);
        if (!g) return;
        document.getElementById('giftbox-id').value = g.id;
        document.getElementById('g-name').value = g.name;
        document.getElementById('g-price').value = g.price;
        document.getElementById('g-description').value = g.description || '';
        document.getElementById('g-badge').value = g.badge || '';
        document.getElementById('g-inStock').checked = g.inStock;
        document.getElementById('g-imageUrl').value = typeof g.image === 'string' && g.image.startsWith('http') ? g.image : '';
        const prev = document.getElementById('g-img-preview');
        prev.innerHTML = g.image ? `<img src="${g.image}" alt="preview">` : '';
        document.getElementById('modal-giftbox-title').textContent = 'Edit Gift Box';
        document.getElementById('giftbox-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        openModal('giftbox');
    } catch { showToast('Failed to load gift box', 'error'); }
}

// ════════════════════════════════════════════════════════════
//  ACCESSORIES
// ════════════════════════════════════════════════════════════
async function loadAccessories() {
    try {
        const res = await fetch(`${API}/accessories`);
        const accs = await res.json();
        document.getElementById('accessories-count').textContent = accs.length;
        const grid = document.getElementById('accessories-grid');
        if (!accs.length) {
            grid.innerHTML = `<div class="empty-state"><i class="fa-solid fa-sunglasses"></i><p>No accessories yet.</p></div>`;
            return;
        }
        grid.innerHTML = accs.map(a => `
            <div class="item-card">
                <div class="item-card-img">
                    <img src="${a.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${a.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    ${!a.inStock ? `<span class="out-of-stock-badge">Out of Stock</span>` : ''}
                </div>
                <div class="item-card-body">
                    <h4>${a.name}</h4>
                    <div class="item-meta">
                        <span class="item-price">৳${a.price.toFixed(2)}</span>
                    </div>
                    <div class="item-actions">
                        <button class="btn-edit" onclick="editAccessory('${a.id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn-delete" onclick="askDelete('accessory','${a.id}','${a.name}')"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch { showToast('Failed to load accessories', 'error'); }
}

document.getElementById('accessory-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('accessory-id').value;
    const formData = new FormData();
    formData.append('name', document.getElementById('ac-name').value);
    formData.append('price', document.getElementById('ac-price').value);
    formData.append('inStock', document.getElementById('ac-inStock').checked);
    const imageUrl = document.getElementById('ac-imageUrl').value;
    const imageFile = document.getElementById('ac-image').files[0];
    if (imageFile) formData.append('image', imageFile);
    else if (imageUrl) formData.append('imageUrl', imageUrl);
    const url = id ? `${API}/accessories/${id}` : `${API}/accessories`;
    const method = id ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, { method, body: formData });
        const data = await res.json();
        if (data.success) {
            showToast(id ? 'Accessory updated!' : 'Accessory added!', 'success');
            closeModal('accessory');
            loadAccessories();
            loadStats();
        } else { showToast(data.message || 'Error', 'error'); }
    } catch { showToast('Server error', 'error'); }
});

async function editAccessory(id) {
    try {
        const res = await fetch(`${API}/accessories`);
        const accs = await res.json();
        const a = accs.find(x => x.id === id);
        if (!a) return;
        document.getElementById('accessory-id').value = a.id;
        document.getElementById('ac-name').value = a.name;
        document.getElementById('ac-price').value = a.price;
        document.getElementById('ac-inStock').checked = a.inStock;
        document.getElementById('ac-imageUrl').value = typeof a.image === 'string' && a.image.startsWith('http') ? a.image : '';
        const prev = document.getElementById('ac-img-preview');
        prev.innerHTML = a.image ? `<img src="${a.image}" alt="preview">` : '';
        document.getElementById('modal-accessory-title').textContent = 'Edit Accessory';
        document.getElementById('accessory-submit-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        openModal('accessory');
    } catch { showToast('Failed to load accessory', 'error'); }
}

// ════════════════════════════════════════════════════════════
//  ORDERS
// ════════════════════════════════════════════════════════════
async function loadOrders() {
    try {
        const res = await fetch(`${API}/orders`);
        const orders = await res.json();
        document.getElementById('orders-count').textContent = orders.length;
        const tbody = document.getElementById('orders-tbody');
        const emptyEl = document.getElementById('orders-empty');
        if (!orders.length) {
            tbody.innerHTML = '';
            emptyEl.classList.remove('hidden');
            return;
        }
        emptyEl.classList.add('hidden');
        tbody.innerHTML = orders.map(o => {
            const itemsSummary = (o.items || []).map(i => `${i.name} ×${i.qty}`).join(', ') || 'N/A';
            const date = new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            const cName = o.customer?.name || 'N/A';
            const cPhone = o.customer?.phone || 'N/A';
            const cAddress = o.customer?.address || 'N/A';
            const customerInfo = `
                <div style="line-height:1.4;">
                    <div style="font-weight:600;color:var(--text);">${cName}</div>
                    <div style="color:var(--text-muted);font-size:11px;margin-top:2px;">
                        <i class="fa-solid fa-phone"></i> ${cPhone}
                    </div>
                    <div style="color:var(--text-muted);font-size:11px;margin-top:2px;" title="${cAddress}">
                        <i class="fa-solid fa-location-dot"></i> ${cAddress.length > 20 ? cAddress.slice(0, 20) + '...' : cAddress}
                    </div>
                </div>
            `;

            return `
                <tr>
                    <td><span class="order-id">${o.id}</span></td>
                    <td>${customerInfo}</td>
                    <td title="${itemsSummary}">${itemsSummary.length > 35 ? itemsSummary.slice(0, 35) + '…' : itemsSummary}</td>
                    <td>৳${(o.total || 0).toFixed(2)}</td>
                    <td>${o.paymentMethod || 'N/A'}</td>
                    <td>${date}</td>
                    <td>
                        <select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                            <option value="pending"   ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="completed" ${o.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td>
                        <button class="btn-del-order" onclick="askDelete('order','${o.id}','this order')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Dashboard recent orders
        const recentEl = document.getElementById('recent-orders-list');
        const recent = orders.slice(0, 5);
        recentEl.innerHTML = recent.length ? recent.map(o => `
            <div class="recent-order-row">
                <span style="font-family:monospace;font-size:11px;color:var(--text-muted)">${o.id.slice(0, 20)}…</span>
                <span class="status-badge status-${o.status}">${o.status}</span>
                <span style="font-weight:700;color:var(--gold)">৳${(o.total || 0).toFixed(2)}</span>
            </div>
        `).join('') : `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No orders yet</p></div>`;

    } catch { showToast('Failed to load orders', 'error'); }
}

async function updateOrderStatus(id, status) {
    try {
        await fetch(`${API}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        showToast('Order status updated!', 'success');
        loadStats();
        loadOrders();
    } catch { showToast('Failed to update status', 'error'); }
}

// ════════════════════════════════════════════════════════════
//  SETTINGS
// ════════════════════════════════════════════════════════════
async function loadSettings() {
    try {
        const res = await fetch(`${API}/settings`);
        const s = await res.json();
        document.getElementById('s-storeName').value = s.storeName || '';
        document.getElementById('s-currency').value = s.currency || '';
        document.getElementById('s-heroTitle').value = s.heroTitle || '';
        document.getElementById('s-heroSubtitle').value = s.heroSubtitle || '';
    } catch { }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        storeName: document.getElementById('s-storeName').value,
        currency: document.getElementById('s-currency').value,
        heroTitle: document.getElementById('s-heroTitle').value,
        heroSubtitle: document.getElementById('s-heroSubtitle').value,
    };
    try {
        const res = await fetch(`${API}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) showToast('Settings saved!', 'success');
        else showToast('Error saving', 'error');
    } catch { showToast('Server error', 'error'); }
});

document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const np = document.getElementById('s-newPassword').value;
    const cp = document.getElementById('s-confirmPassword').value;
    if (np !== cp) { showToast('Passwords do not match!', 'error'); return; }
    try {
        const res = await fetch(`${API}/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminPassword: np })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Password updated!', 'success');
            document.getElementById('s-newPassword').value = '';
            document.getElementById('s-confirmPassword').value = '';
        } else showToast('Error updating', 'error');
    } catch { showToast('Server error', 'error'); }
});

// ════════════════════════════════════════════════════════════
//  DELETE CONFIRM
// ════════════════════════════════════════════════════════════
function askDelete(type, id, name) {
    document.getElementById('delete-message').textContent = `Are you sure you want to delete "${name}"? This cannot be undone.`;
    deleteCallback = async () => {
        const endpoints = { product: 'products', giftbox: 'giftboxes', accessory: 'accessories', order: 'orders' };
        const endpoint = endpoints[type];
        if (!endpoint) return;
        try {
            await fetch(`${API}/${endpoint}/${id}`, { method: 'DELETE' });
            showToast('Deleted successfully!', 'success');
            closeDeleteModal();
            if (type === 'product') { loadProducts(); loadStats(); }
            if (type === 'giftbox') { loadGiftBoxes(); loadStats(); }
            if (type === 'accessory') { loadAccessories(); loadStats(); }
            if (type === 'order') { loadOrders(); loadStats(); }
        } catch { showToast('Delete failed', 'error'); }
    };
    openModal('delete');
}

document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (deleteCallback) deleteCallback();
});

function closeDeleteModal() {
    closeModal('delete');
    deleteCallback = null;
}

// ════════════════════════════════════════════════════════════
//  MODAL HELPERS
// ════════════════════════════════════════════════════════════
function openModal(type) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
    document.getElementById(`modal-${type}`).classList.remove('hidden');
}

function closeModal(type) {
    document.getElementById(`modal-${type}`).classList.add('hidden');
    // If no other modal is visible, hide overlay
    const anyVisible = [...document.querySelectorAll('.modal')].some(m => !m.classList.contains('hidden'));
    if (!anyVisible) document.getElementById('modal-overlay').classList.add('hidden');
    // Reset forms
    const formIds = { product: 'product-form', giftbox: 'giftbox-form', accessory: 'accessory-form' };
    if (formIds[type]) {
        document.getElementById(formIds[type]).reset();
        document.getElementById(`${type === 'product' ? 'p' : type === 'giftbox' ? 'g' : 'ac'}-img-preview`).innerHTML = '';
        document.getElementById(`${type}-id`).value = '';
    }
    // Reset modal titles
    const titles = { product: 'Add Product', giftbox: 'Add Gift Box', accessory: 'Add Accessory' };
    const submitBtns = {
        product: '<i class="fa-solid fa-plus"></i> Add Product',
        giftbox: '<i class="fa-solid fa-plus"></i> Add Gift Box',
        accessory: '<i class="fa-solid fa-plus"></i> Add Accessory'
    };
    if (titles[type]) {
        document.getElementById(`modal-${type}-title`).textContent = titles[type];
        document.getElementById(`${type}-submit-btn`).innerHTML = submitBtns[type];
    }
}

// Close overlay on backdrop click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) {
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        document.getElementById('modal-overlay').classList.add('hidden');
    }
});

// ─── Image preview on file select ────────────────────────
function setupImagePreview(fileInputId, previewId) {
    document.getElementById(fileInputId).addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(previewId).innerHTML = `<img src="${e.target.result}" alt="preview">`;
        };
        reader.readAsDataURL(file);
    });
}

setupImagePreview('p-image', 'p-img-preview');
setupImagePreview('g-image', 'g-img-preview');
setupImagePreview('ac-image', 'ac-img-preview');
