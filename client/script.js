const API = "https://boss-tako-api.onrender.com";
let cart = [];

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

  // ✅ FIXED: send plain local date/time string, no UTC conversion
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
}

/* ===============================
TIME FORMAT HELPER
================================= */
function formatTime12h(dateTimeStr) {
  if (!dateTimeStr) return "ASAP";

  // handles "2024-01-15 13:30:00" or "2024-01-15T13:30:00"
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