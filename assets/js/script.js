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

// Attach event listeners to all "Add To Cart" buttons
document.querySelectorAll('.product-card button, .gift-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
        e.preventDefault();
        const card = this.closest('.product-card') || this.closest('.gift-card');
        if (!card) return;
        const name = card.querySelector('h3').textContent;
        const priceText = card.querySelector('p')?.textContent || card.querySelector('.gift-price')?.textContent || '0';
        const price = priceText.replace(/[^0-9.]/g, '');
        const image = card.querySelector('img')?.src || '';
        const size = card.getAttribute('data-size') || 'N/A';
        addToCart(name, price, image, size.toUpperCase());
    });
});

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
// PLACE ORDER  (saves to backend)
// ============================================
placeOrderBtn.addEventListener('click', async function () {
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    if (!selectedPayment) return;

    const method = selectedPayment.value;
    let txnRef = '';
    let message = '';

    if (method === 'bkash') {
        txnRef = document.getElementById('bkash-txn').value.trim();
        if (!txnRef) { alert('Please enter your bKash Transaction ID.'); return; }
        message = `Your order has been placed successfully via bKash.\nTransaction ID: ${txnRef}\nWe will verify your payment and confirm shortly.`;
    } else if (method === 'nagad') {
        txnRef = document.getElementById('nagad-txn').value.trim();
        if (!txnRef) { alert('Please enter your Nagad Transaction ID.'); return; }
        message = `Your order has been placed successfully via Nagad.\nTransaction ID: ${txnRef}\nWe will verify your payment and confirm shortly.`;
    } else if (method === 'cod') {
        txnRef = document.getElementById('cod-address').value.trim();
        if (!txnRef) { alert('Please enter your delivery address.'); return; }
        message = `Your order has been placed with Cash on Delivery.\nDelivery Address: ${txnRef}\nPay when you receive your order.`;
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const orderPayload = {
        items: cart.map(i => ({ name: i.name, size: i.size, qty: i.qty, price: i.price })),
        total: parseFloat(total.toFixed(2)),
        paymentMethod: method,
        transactionRef: txnRef,
    };

    // Save order to backend (non-blocking — store will work even if server is offline)
    try {
        await fetch('http://localhost:3000/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });
    } catch { /* server not running — order still shown to customer */ }

    // Close checkout, show order confirmation
    closeCheckoutModal();
    confirmMessage.textContent = message;
    orderConfirmModal.classList.add('active');

    // Clear cart & inputs
    cart = [];
    updateCartUI();
    document.getElementById('bkash-txn').value = '';
    document.getElementById('nagad-txn').value = '';
    document.getElementById('cod-address').value = '';
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
