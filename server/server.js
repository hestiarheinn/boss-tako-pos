const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();

app.use(cors());
app.use(express.json());

/* ===============================
   DATABASE CONNECTION
================================= */


 const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

db.connect((err) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err);
  } else {
    console.log("✅ MySQL Connected");
  }
});

/* ===============================
   PRODUCTS
================================= */

// GET PRODUCTS
app.get("/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ADD PRODUCT
app.post("/products", (req, res) => {
  const { name, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({
      error: "Missing fields"
    });
  }

  db.query(
    "INSERT INTO products (name,price) VALUES (?,?)",
    [name, price],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      res.json({
        message: "Product added",
        id: result.insertId
      });
    }
  );
});

// DELETE PRODUCT
app.delete("/products/:id", (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);

    res.json({
      message: "Product deleted"
    });
  });
});

/* ===============================
   CREATE ORDER
================================= */

app.post("/orders", (req, res) => {
  console.log("📦 INCOMING ORDER:", req.body);

  const {
    name,
    phone,
    orderType,
    address,
    deliveryFee,
    payment,
    total,
    items,
    scheduledAt
  } = req.body;

  if (!name || !total) {
    return res.status(400).json({
      error: "Missing required fields"
    });
  }

  const sql = `
    INSERT INTO orders
    (
      customer_name,
      phone,
      order_type,
      address,
      delivery_fee,
      payment,
      total,
      status,
      scheduled_at
    )
    VALUES
    (?,?,?,?,?,?,?,'Pending',?)
  `;

  db.query(
    sql,
    [
      name,
      phone || "",
      orderType || "Pickup",
      address || "",
      deliveryFee || 0,
      payment || "Cash",
      total,
      scheduledAt || null
    ],
    (err, result) => {
      if (err) {
        console.error("❌ ORDER ERROR:", err);
        return res.status(500).json(err);
      }

      const orderId = result.insertId;

      console.log("✅ ORDER CREATED:", orderId);

      if (!items || items.length === 0) {
        return res.json({
          message: "Order Saved"
        });
      }

      const itemSql = `
        INSERT INTO order_items
        (
          order_id,
          item_name,
          quantity,
          price
        )
        VALUES ?
      `;

      const values = items.map((i) => [
        orderId,
        i.itemName,
        i.qty,
        i.price
      ]);

      db.query(itemSql, [values], (err) => {
        if (err) {
          console.error("❌ ITEM ERROR:", err);
          return res.status(500).json(err);
        }

        res.json({
          message: "Order Saved"
        });
      });
    }
  );
});

/* ===============================
   GET PENDING ORDERS
================================= */

app.get("/orders", (req, res) => {
  const sql = `
    SELECT
      orders.*,
      COALESCE(
        orders.scheduled_at,
        orders.created_at
      ) AS queue_time,
      GROUP_CONCAT(
        CONCAT(
          order_items.item_name,
          ' x',
          order_items.quantity
        )
        SEPARATOR ', '
      ) AS items
    FROM orders
    LEFT JOIN order_items
      ON orders.id = order_items.order_id
    WHERE orders.status='Pending'
    GROUP BY orders.id
    ORDER BY queue_time ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ ORDERS ERROR:", err);
      return res.status(500).json(err);
    }

    res.json(result);
  });
});

/* ===============================
   COMPLETE ORDER
================================= */

app.put("/orders/:id", (req, res) => {
  db.query(
    "UPDATE orders SET status='Completed' WHERE id=?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      console.log("✅ COMPLETED ORDER:", req.params.id);

      res.json({
        message: "Order Completed"
      });
    }
  );
});

/* ===============================
   SALES HISTORY
================================= */

app.get("/sales", (req, res) => {
  const sql = `
    SELECT
      orders.*,
      GROUP_CONCAT(
        CONCAT(
          order_items.item_name,
          ' x',
          order_items.quantity
        )
        SEPARATOR ', '
      ) AS items
    FROM orders
    LEFT JOIN order_items
      ON orders.id = order_items.order_id
    WHERE orders.status='Completed'
    GROUP BY orders.id
    ORDER BY orders.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ SALES ERROR:", err);
      return res.status(500).json(err);
    }

    console.log("💰 SALES SENT:", result.length);

    res.json(result);
  });
});

/* ===============================
   DASHBOARD
================================= */

app.get("/dashboard", (req, res) => {
  const sql = `
    SELECT
      COUNT(*) AS totalOrders,
      IFNULL(SUM(total),0) AS totalSales
    FROM orders
    WHERE DATE(created_at)=CURDATE()
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result[0]);
  });
});

/* ===============================
   START SERVER
================================= */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});