const API = "http://localhost:3001";
let cart = [];

/* MENU MANAGEMENT */
async function loadMenu() {
  try {
    const res = await fetch(`${API}/products`);
    const products = await res.json();
    const menu = document.getElementById("menu");
    menu.innerHTML = "";

    products.forEach(p => {
      menu.innerHTML += `
        <div class="menu-item" onclick="addToCart(${p.id}, '${p.name}', ${p.price})">
          <strong>${p.name}</strong>
          <div>₱${parseFloat(p.price).toFixed(2)}</div>
        </div>
      `;
    });
  } catch (err) {
    console.error("Error loading menu:", err);
  }
}

/* CART MANAGEMENT */
function addToCart(id, name, price) {
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id, itemName: name, price, qty: 1 });
  }
  renderCart();
}

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  renderCart();
}

function renderCart() {
  const items = document.getElementById("items");
  items.innerHTML = "";
  let subtotal = 0;

  cart.forEach((item, i) => {
    subtotal += item.price * item.qty;
    items.innerHTML += `
      <div class="item-row">
        <span>${item.itemName}</span>
        <div>
          <button onclick="changeQty(${i}, -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${i}, 1)">+</button>
        </div>
      </div>
    `;
  });

  const type = document.getElementById("orderType").value;
  const delivery = type === "Delivery" ? Number(document.getElementById("deliveryFee").value) : 0;
  document.getElementById("total").innerText = (subtotal + delivery).toFixed(2);
}

/* EVENT LISTENERS */
document.getElementById("orderType").addEventListener("change", () => {
  const type = document.getElementById("orderType").value;
  document.getElementById("addressField").style.display = type === "Delivery" ? "block" : "none";
  document.getElementById("deliveryField").style.display = type === "Delivery" ? "block" : "none";
  renderCart();
});

document.getElementById("deliveryFee").addEventListener("change", renderCart);

function showError(id) {
  const input = document.getElementById(id);
  if (input) {
    input.style.border = "2px solid red";
    input.style.background = "#ffe5e5";
  }
}

function clearError(id) {
  const input = document.getElementById(id);
  if (input) {
    input.style.border = "";
    input.style.background = "";
  }
}

["name", "phone", "address", "orderDate", "orderTime"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", () => clearError(id));
});

/* SAVE ORDER */
async function saveOrder() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const orderType = document.getElementById("orderType").value;
  const address = document.getElementById("address").value.trim();
  const payment = document.getElementById("payment").value;

  let valid = true;
  if (!name) { showError("name"); valid = false; }
  if (cart.length === 0) { document.getElementById("items").style.border = "2px solid red"; valid = false; }
  if (orderType === "Delivery" && !address) { showError("address"); valid = false; }

  if (!valid) return;

  let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const deliveryFee = orderType === "Delivery" ? Number(document.getElementById("deliveryFee").value) : 0;
  const total = subtotal + deliveryFee;

  const date = document.getElementById("orderDate").value;
  const time = document.getElementById("orderTime").value;
  const scheduledAt = (date && time) ? `${date} ${time}:00` : null;

  await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone, orderType, address, deliveryFee, payment, total, items: cart, scheduledAt })
  });

  // Reset Input
  cart = [];
  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";
  document.getElementById("orderDate").value = "";
  document.getElementById("orderTime").value = "";
  document.getElementById("orderType").value = "Pickup";
  document.getElementById("payment").value = "Cash";
  document.getElementById("addressField").style.display = "none";
  document.getElementById("deliveryField").style.display = "none";
  document.getElementById("items").style.border = "";

  renderCart();
  loadOrders();
}

/* LOAD PENDING ORDERS */
async function loadOrders() {
  try {
    const res = await fetch(`${API}/orders`);
    let orders = await res.json();

    const pending = document.getElementById("pendingOrders");
    pending.innerHTML = "";

    orders.sort((a, b) => {
      if (!a.scheduled_at) return 1;
      if (!b.scheduled_at) return -1;
      return new Date(a.scheduled_at) - new Date(b.scheduled_at);
    });

    orders.forEach(o => {
      if (o.status !== "Pending") return;
      const time = o.scheduled_at ? new Date(o.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "ASAP";

      pending.innerHTML += `
        <div class="order-card">
          <strong>👤 ${o.customer_name} <span>🕒 ${time}</span></strong>
          <p>🍱 ${o.items || 'No items listed'}</p>
          <p>🛵 ${o.order_type} ${o.order_type === "Delivery" ? `(${o.address})` : ''}</p>
          <p>💳 ${o.payment} | <strong>₱${Number(o.total).toFixed(2)}</strong></p>
          <button onclick="completeOrder(${o.id})">Complete</button>
        </div>
      `;
    });
  } catch (err) {
    console.error("Failed to load pending orders:", err);
  }
}

async function completeOrder(id) {
  await fetch(`${API}/orders/${id}`, { method: "PUT" });
  loadOrders();
}

/* INIT */
loadMenu();
loadOrders();
renderCart();

setInterval(() => {
  const el = document.getElementById("currentTime");
  if (el) el.innerText = new Date().toLocaleTimeString();
}, 1000);