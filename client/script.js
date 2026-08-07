const API = "https://boss-tako-api.onrender.com";
let cart = [];

/* ===============================
SAVE ORDER (FIXED)
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

  // ✅ CRITICAL FIX
  const scheduledAt = (date && time)
    ? new Date(`${date}T${time}`).toISOString()
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
}

/* ===============================
LOAD ORDERS (FINAL TIME FIX)
================================= */
async function loadOrders() {
  const res = await fetch(`${API}/orders`);
  const orders = await res.json();

  const pending = document.getElementById("pendingOrders");
  pending.innerHTML = "";

  orders.forEach(o => {
    const time = o.scheduled_at
      ? new Date(o.scheduled_at).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        }).replace("AM", "am").replace("PM", "pm")
      : "ASAP";

    pending.innerHTML += `
      <div class="order-card">
        <strong>${o.customer_name}</strong>
        <div>🕒 ${time}</div>
        <div>${o.items || ""}</div>
      </div>
    `;
  });
}