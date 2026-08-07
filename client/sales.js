const API = "https://boss-tako-api.onrender.com";

async function loadSales() {
  try {
    const res = await fetch(`${API}/sales`);
    const sales = await res.json();

    const salesDiv = document.getElementById("salesData");
    salesDiv.innerHTML = "";

    if (sales.length === 0) {
      salesDiv.innerHTML = `
        <div class="card">
          <div class="card-body">
            <p>No completed orders yet.</p>
          </div>
        </div>
      `;
      return;
    }

    /*
    ====================================
    GROUP SALES BY DATE
    ====================================
    */
    let dailySales = {};

    sales.forEach((order) => {
      const orderDate = new Date(order.created_at);

      const dateKey = orderDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      if (!dailySales[dateKey]) {
        dailySales[dateKey] = {
          orders: [],
          total: 0
        };
      }

      dailySales[dateKey].orders.push(order);
      dailySales[dateKey].total += parseFloat(order.total);
    });

    /*
    ====================================
    DISPLAY SALES
    ====================================
    */
    Object.keys(dailySales).forEach((date) => {
      const day = dailySales[date];

      let html = `
        <section class="card">
          <div class="card-header">
            <h2>📅 ${date}</h2>
            <h3>💰 Total Sales: ₱${day.total.toFixed(2)}</h3>
          </div>
          <div class="card-body">
      `;

      day.orders.forEach((order) => {
        html += `
          <div class="product-row">
            <div>
              <strong>👤 ${order.customer_name}</strong>
              <p>🍡 ${order.items || "No items"}</p>
              <p>📞 ${order.phone || "No phone"}</p>
              <p>🛵 ${order.order_type} | 💳 ${order.payment}</p>
              <small>
                Completed: ${new Date(order.created_at).toLocaleString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </small>
            </div>
            <strong style="font-size:1.2rem;">
              ₱${parseFloat(order.total).toFixed(2)}
            </strong>
          </div>
        `;
      });

      html += `
          </div>
        </section>
      `;

      salesDiv.innerHTML += html;
    });
  } catch (error) {
    console.error("❌ Failed loading sales:", error);
  }
}

loadSales();