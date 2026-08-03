console.log("Welcome to ThreadBox");

// ============================================
// SIZE FILTER
// ============================================
function filterSize(size) {
    const products = document.querySelectorAll('.product-card');
    products.forEach(product => {
        const productSize = product.getAttribute('data-size');
        if (size === 'all' || productSize === size) {
            product.classList.remove('hidden');
        } else {
            product.classList.add('hidden');
        }
    });
    const productsSection = document.querySelector('.products');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ============================================
// CART STATE
// ============================================
let cart = [];

const cartIcon = document.getElementById('cart-icon');
const cartDrawer = document.getElementById('cart-drawer');
const cartClose = document.getElementById('cart-close');
const cartItemsEl = document.getElementById('cart-items');
const cartCountEl = document.getElementById('cart-count');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const checkoutBtn = document.getElementById('checkout-btn');
const overlayBackdrop = document.getElementById('overlay-backdrop');

// Checkout Modal
const checkoutModal = document.getElementById('checkout-modal');
const checkoutClose = document.getElementById('checkout-close');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutTotalEl = document.getElementById('checkout-total');
const placeOrderBtn = document.getElementById('place-order-btn');
const paymentDetails = document.getElementById('payment-details');

// Order Confirm
const orderConfirmModal = document.getElementById('order-confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmCloseBtn = document.getElementById('confirm-close-btn');

// ============================================
// OPEN / CLOSE CART DRAWER
// ============================================
function openCartDrawer() {
    cartDrawer.classList.add('open');
    overlayBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    cartDrawer.classList.remove('open');
    overlayBackdrop.classList.remove('active');
    document.body.style.overflow = '';
}

cartIcon.addEventListener('click', openCartDrawer);
cartClose.addEventListener('click', closeCartDrawer);
overlayBackdrop.addEventListener('click', () => {
    closeCartDrawer();
    closeCheckoutModal();
});

// ============================================
// ADD TO CART
// ============================================
function addToCart(name, price, image, size) {
    const existingItem = cart.find(item => item.name === name && item.size === size);
    if (existingItem) {
        existingItem.qty++;
    } else {
        cart.push({ name, price: parseFloat(price), image, size, qty: 1 });
    }
    updateCartUI();
    openCartDrawer();
}

// Attach event listeners to all "Add To Cart" buttons via Event Delegation
document.addEventListener('click', function (e) {
    if (e.target.matches('.product-card button') || e.target.matches('.gift-btn')) {
        e.preventDefault();
        const card = e.target.closest('.product-card') || e.target.closest('.gift-card') || e.target.closest('.accessory-card');
        if (!card) return;
        const name = card.querySelector('h3').textContent;
        const priceText = card.querySelector('p:not(.accessory-price)')?.textContent || card.querySelector('.gift-price')?.textContent || card.querySelector('.accessory-price')?.textContent || '0';
        const price = priceText.replace(/[^0-9.]/g, '');
        const image = card.querySelector('img')?.src || '';
        const size = card.getAttribute('data-size') || 'N/A';
        addToCart(name, price, image, size.toUpperCase());
    }
});

// ============================================
// FETCH DATA FROM BACKEND
// ============================================
async function loadFrontendData() {
    try {
        const pRes = await fetch('http://localhost:3000/api/products');
        const products = await pRes.json();

        const gRes = await fetch('http://localhost:3000/api/giftboxes');
        const giftBoxes = await gRes.json();

        const aRes = await fetch('http://localhost:3000/api/accessories');
        const accessories = await aRes.json();

        // Render Products
        const pGrid = document.getElementById('dynamic-product-grid');
        if (pGrid) {
            pGrid.innerHTML = products.map(p => `
                <div class="product-card" data-size="${p.size.toLowerCase()}">
                    <div class="product-image-container">
                        <img src="${p.image}" alt="${p.name}">
                        <span class="product-size-badge">Size ${p.size}</span>
                        ${p.badge ? `<span class="product-size-badge" style="top:15px;right:15px;background:#e74c3c;color:#fff;">${p.badge}</span>` : ''}
                    </div>
                    <h3>${p.name}</h3>
                    <p>৳${p.price.toFixed(2)}</p>
                    <button>Add To Cart</button>
                </div>
            `).join('');
        }

        // Render Gift Boxes
        const gGrid = document.getElementById('dynamic-gift-grid');
        if (gGrid) {
            gGrid.innerHTML = giftBoxes.map(g => `
                <div class="gift-card">
                    <div class="gift-image-container">
                        <img src="${g.image}" alt="${g.name}">
                        ${g.badge ? `<span class="gift-badge">${g.badge}</span>` : ''}
                    </div>
                    <div class="gift-content">
                        <h3>${g.name}</h3>
                        <p>${g.description}</p>
                        <span class="gift-price">৳${g.price.toFixed(2)}</span>
                        <button class="gift-btn">Customize Box</button>
                    </div>
                </div>
            `).join('');
        }

        // Render Accessories
        const aGrid = document.getElementById('dynamic-accessories-grid');
        if (aGrid) {
            aGrid.innerHTML = accessories.map(a => `
                <div class="accessory-card">
                    <img src="${a.image}" alt="${a.name}">
                    <div class="accessory-info">
                        <h3>${a.name}</h3>
                        <p class="accessory-price">৳${a.price.toFixed(2)}</p>
                        <button class="gift-btn" style="margin-top:10px;padding:8px 12px;font-size:12px;">Add to Cart</button>
                    </div>
                </div>
            `).join('');
        }

    } catch (err) {
        console.error("Failed to load data from backend:", err);
    }
}

// Load data when page loads
document.addEventListener('DOMContentLoaded', loadFrontendData);

// ============================================
// RENDER CART UI
// ============================================
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Update badge
    cartCountEl.textContent = totalItems;

    // Update subtotal
    cartSubtotalEl.textContent = '৳' + totalPrice.toFixed(2);

    // Enable/disable checkout
    checkoutBtn.disabled = cart.length === 0;

    // Render items
    if (cart.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="drawer-empty">
                <i class="fa-solid fa-bag-shopping"></i>
                <p>Your cart is empty</p>
            </div>`;
        return;
    }

    cartItemsEl.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-img">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-size">Size: ${item.size}</div>
                <div class="cart-item-price">৳${(item.price * item.qty).toFixed(2)}</div>
            </div>
            <div class="cart-item-qty">
                <button onclick="changeQty(${index}, -1)">−</button>
                <span>${item.qty}</span>
                <button onclick="changeQty(${index}, 1)">+</button>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function changeQty(index, delta) {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// ============================================
// CHECKOUT MODAL
// ============================================
function openCheckoutModal() {
    closeCartDrawer();

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    // Render order summary
    checkoutItemsList.innerHTML = cart.map(item => `
        <div class="checkout-summary-item">
            <span>${item.name} (${item.size}) × ${item.qty}</span>
            <span>৳${(item.price * item.qty).toFixed(2)}</span>
        </div>
    `).join('');

    checkoutTotalEl.textContent = '৳' + totalPrice.toFixed(2);

    // Reset payment selection
    document.querySelectorAll('input[name="payment"]').forEach(r => r.checked = false);
    paymentDetails.style.display = 'none';
    document.getElementById('bkash-details').style.display = 'none';
    document.getElementById('nagad-details').style.display = 'none';
    document.getElementById('cod-details').style.display = 'none';
    placeOrderBtn.disabled = true;

    checkoutModal.classList.add('active');
    overlayBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
    checkoutModal.classList.remove('active');
    overlayBackdrop.classList.remove('active');
    document.body.style.overflow = '';
}

checkoutBtn.addEventListener('click', openCheckoutModal);
checkoutClose.addEventListener('click', closeCheckoutModal);

// ============================================
// PAYMENT METHOD SELECTION
// ============================================
document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const method = this.value;

        paymentDetails.style.display = 'block';
        document.getElementById('bkash-details').style.display = method === 'bkash' ? 'block' : 'none';
        document.getElementById('nagad-details').style.display = method === 'nagad' ? 'block' : 'none';
        document.getElementById('cod-details').style.display = method === 'cod' ? 'block' : 'none';

        placeOrderBtn.disabled = false;
    });
});

// ============================================
// PLACE ORDER (Saves to backend)
// ============================================
placeOrderBtn.addEventListener('click', async function () {
    const custName = document.getElementById('cust-name').value.trim();
    const custPhone = document.getElementById('cust-phone').value.trim();
    const custAddress = document.getElementById('cust-address').value.trim();

    if (!custName || !custPhone || !custAddress) {
        alert("Please fill in all your Delivery Details (Name, Phone, Address).");
        return;
    }

    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    if (!selectedPayment) return;

    const method = selectedPayment.value;
    let txnRef = '';

    if (method === 'bkash') {
        txnRef = document.getElementById('bkash-txn').value.trim();
        if (!txnRef) { alert('Please enter your bKash Transaction ID.'); return; }
    } else if (method === 'nagad') {
        txnRef = document.getElementById('nagad-txn').value.trim();
        if (!txnRef) { alert('Please enter your Nagad Transaction ID.'); return; }
    } else if (method === 'cod') {
        txnRef = "Cash on Delivery";
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderPayload = {
        customer: { name: custName, phone: custPhone, address: custAddress },
        items: cart.map(i => ({ name: i.name, size: i.size, qty: i.qty, price: i.price })),
        total: parseFloat(total.toFixed(2)),
        paymentMethod: method,
        transactionRef: txnRef,
    };

    // Save to Backend
    try {
        await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
    } catch { console.error("Order save failed"); }

    // Close checkout, Show Receipt Complete
    closeCheckoutModal();

    // Render Receipt Box
    const receiptBox = document.getElementById('receipt-box');
    const orderDate = new Date().toLocaleDateString('en-GB');
    receiptBox.innerHTML = `
        <div class="receipt-row"><span class="receipt-label">Name:</span> <span class="receipt-value">${custName}</span></div>
        <div class="receipt-row"><span class="receipt-label">Phone:</span> <span class="receipt-value">${custPhone}</span></div>
        <div class="receipt-row"><span class="receipt-label">Address:</span> <span class="receipt-value">${custAddress}</span></div>
        <div class="receipt-row"><span class="receipt-label">Payment:</span> <span class="receipt-value">${method.toUpperCase()}</span></div>
        <div class="receipt-row"><span class="receipt-label">Date:</span> <span class="receipt-value">${orderDate}</span></div>
        <div class="receipt-row"><span class="receipt-label">Total Amount:</span> <span class="receipt-value" style="font-weight:bold;color:#b88a44;">৳${total.toFixed(2)}</span></div>
    `;

    orderConfirmModal.classList.add('active');

    // Clear cart and inputs
    cart = [];
    updateCartUI();
    document.getElementById('cust-name').value = '';
    document.getElementById('cust-phone').value = '';
    document.getElementById('cust-address').value = '';
    document.getElementById('bkash-txn').value = '';
    document.getElementById('nagad-txn').value = '';
});

// Download Receipt
document.getElementById('download-receipt-btn').addEventListener('click', function () {
    const btnGroup = document.querySelector('.receipt-actions');
    const oldDisplay = btnGroup.style.display;

    // Temporarily hide buttons so they don't show in the image
    btnGroup.style.display = 'none';

    html2canvas(document.getElementById('receipt-content'), { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `ThreadBox-Receipt-${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // Restore buttons
        btnGroup.style.display = oldDisplay;
    }).catch(err => {
        console.error("Failed to download receipt:", err);
        btnGroup.style.display = oldDisplay;
    });
});

// Close order confirmation
confirmCloseBtn.addEventListener('click', function () {
    orderConfirmModal.classList.remove('active');
});

// ============================================
// BACK TO TOP BUTTON
// ============================================
const backToTopBtn = document.getElementById('back-to-top');

function handleBackToTopVisibility() {
    const scrolled = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    if (scrolled > 300) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
}

window.addEventListener('scroll', handleBackToTopVisibility, { passive: true });
document.addEventListener('scroll', handleBackToTopVisibility, { passive: true });

backToTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
