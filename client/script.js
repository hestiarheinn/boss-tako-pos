const API = "https://boss-tako-api.onrender.com";
let cart = [];

/* ===============================
   MENU MANAGEMENT
================================= */
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

/* ===============================
   CART MANAGEMENT
================================= */
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
  const delivery = type === "Delivery"
    ? Number(document.getElementById("deliveryFee").value)
    : 0;

  document.getElementById("total").innerText = (subtotal + delivery).toFixed(2);
}

/* ===============================
   SAVE ORDER
================================= */
async function saveOrder() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const orderType = document.getElementById("orderType").value;
  const address = document.getElementById("address").value.trim();
  const payment = document.getElementById("payment").value;
  const notes = document.getElementById("itemNotes")?.value.trim() || "";

  let valid = true;
  if (!name) valid = false;
  if (cart.length === 0) valid = false;
  if (orderType === "Delivery" && !address) valid = false;

  if (!valid) return;

  let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const deliveryFee = orderType === "Delivery"
    ? Number(document.getElementById("deliveryFee").value)
    : 0;

  const total = subtotal + deliveryFee;

  const date = document.getElementById("orderDate").value;
  const time = document.getElementById("orderTime").value;

  const scheduledAt = (date && time)
    ? `${date} ${time}:00`
    : null;

  const itemsWithNotes = cart.map(item => ({
    ...item,
    notes
  }));

  await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      phone,
      orderType,
      address,
      deliveryFee,
      payment,
      total,
      items: itemsWithNotes,
      scheduledAt
    })
  });

  cart = [];
  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";
  document.getElementById("orderDate").value = "";
  document.getElementById("orderTime").value = "";
  if (document.getElementById("itemNotes")) {
    document.getElementById("itemNotes").value = "";
  }

  renderCart();
  loadOrders();
}

/* ===============================
   LOAD PENDING ORDERS
================================= */
async function loadOrders() {
  try {
    const res = await fetch(`${API}/orders`);
    let orders = await res.json();

    const pending = document.getElementById("pendingOrders");
    pending.innerHTML = "";

    orders.forEach(o => {
      if (o.status !== "Pending") return;

      // ✅ FINAL TIME FIX (1:30 pm FORMAT)
      const time = o.scheduled_at
        ? new Date(o.scheduled_at).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
          }).replace("AM", "am").replace("PM", "pm")
        : "ASAP";

      const location = o.order_type === "Delivery"
        ? (o.address || "No address provided")
        : "Store Pickup";

      const phone = o.phone || "No contact number";

      // ✅ BACKEND RETURNS STRING
      const itemsDisplay = o.items || "No items listed";

      pending.innerHTML += `
        <div class="order-card">
          <div class="order-header">
            <strong>👤 ${o.customer_name}</strong>
            <span class="order-time">🕒 ${time}</span>
          </div>
          
          <p>📞 <strong>Phone:</strong> ${phone}</p>
          <p>🛵 <strong>Type & Location:</strong> ${o.order_type} — ${location}</p>
          <p>🍱 <strong>Items:</strong> ${itemsDisplay}</p>
          <p>💳 <strong>Payment:</strong> ${o.payment}</p>
          <p><strong>💰 ₱${Number(o.total).toFixed(2)}</strong></p>

          <button onclick="completeOrder(${o.id})">Complete Order</button>
        </div>
      `;
    });

  } catch (err) {
    console.error("Failed to load pending orders:", err);
  }
}

/* ===============================
   COMPLETE ORDER
================================= */
async function completeOrder(id) {
  await fetch(`${API}/orders/${id}`, { method: "PUT" });
  loadOrders();
}

/* ===============================
   INIT
================================= */
loadMenu();
loadOrders();
renderCart();

/* CLOCK */
setInterval(() => {
  const el = document.getElementById("currentTime");
  if (el) {
    el.innerText = new Date()
      .toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })
      .replace("AM", "am")
      .replace("PM", "pm");
  }
}, 1000);