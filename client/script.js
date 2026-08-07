const API = "https://boss-tako-api.onrender.com";
let cart = [];

/* ===============================
LOAD MENU
================================= */
async function loadMenu() {
  try {
    const res = await fetch(`${API}/products`);
    const products = await res.json();
    const menu = document.getElementById("menu");
    menu.innerHTML = "";

    products.forEach(p => {
      const div = document.createElement("div");
      div.className = "menu-item";
      div.innerHTML = `
        <strong>${p.name}</strong>
        <div>₱${parseFloat(p.price).toFixed(2)}</div>
      `;
      div.onclick = () => addToCart(p);
      menu.appendChild(div);
    });
  } catch (err) {
    console.error("Failed to load menu:", err);
  }
}

/* ===============================
CART LOGIC
================================= */
function addToCart(product) {
  const existing = cart.find(item => item.itemName === product.name);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      itemName: product.name,
      price: parseFloat(product.price),
      qty: 1
    });
  }
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const itemsDiv = document.getElementById("items");
  itemsDiv.innerHTML = "";

  let subtotal = 0;

  cart.forEach((item, index) => {
    subtotal += item.price * item.qty;
    itemsDiv.innerHTML += `
      <div class="cart-item">
        <span>${item.itemName} x${item.qty}</span>
        <span>₱${(item.price * item.qty).toFixed(2)}</span>
        <button onclick="removeFromCart(${index})" class="btn-icon">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
  });

  const orderType = document.getElementById("orderType").value;
  const deliveryFee = orderType === "Delivery"
    ? Number(document.getElementById("deliveryFee").value)
    : 0;

  const total = subtotal + deliveryFee;
  document.getElementById("total").innerText = total.toFixed(2);
}

/* ===============================
ORDER TYPE TOGGLE (show/hide address & delivery fee)
================================= */
document.getElementById("orderType").addEventListener("change", (e) => {
  const isDelivery = e.target.value === "Delivery";
  document.getElementById("addressField").style.display = isDelivery ? "flex" : "none";
  document.getElementById("deliveryField").style.display = isDelivery ? "flex" : "none";
  renderCart();
});

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

  if (!name || cart.length === 0) return;

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
  renderCart();
  loadOrders();

  // clear form
  document.getElementById("name").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("address").value = "";
  document.getElementById("itemNotes").value = "";
  document.getElementById("orderDate").value = "";
  document.getElementById("orderTime").value = "";
}

/* ===============================
TIME FORMAT HELPER
================================= */
function formatTime12h(dateTimeStr) {
  if (!dateTimeStr) return "ASAP";

  const timePart = dateTimeStr.includes("T")
    ? dateTimeStr.split("T")[1]
    : dateTimeStr.split(" ")[1];

  if (!timePart) return "ASAP";

  let [h, m] = timePart.split(":").map(Number);
  const ampm = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${ampm}`;
}

/* ===============================
LOAD ORDERS
================================= */
async function loadOrders() {
  const res = await fetch(`${API}/orders`);
  const orders = await res.json();

  const pending = document.getElementById("pendingOrders");
  pending.innerHTML = "";

  orders.forEach(o => {
    const time = formatTime12h(o.scheduled_at);

    pending.innerHTML += `
      <div class="order-card">
        <strong>${o.customer_name}</strong>
        <div>🕒 ${time}</div>
        <div>${o.items || ""}</div>
      </div>
    `;
  });
}

/* ===============================
CLOCK
================================= */
setInterval(() => {
  const el = document.getElementById("currentTime");
  if (el) el.innerText = new Date().toLocaleTimeString();
}, 1000);

/* ===============================
INIT
================================= */
loadMenu();
loadOrders();