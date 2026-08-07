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
  host: process.env.DB_HOST || "sakura.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "DITjlmOrCCTYkRkIUFviLSZOQFOEJIJf",
  database: process.env.DB_NAME || "railway",
  port: process.env.DB_PORT || 59587,
  ssl: { rejectUnauthorized: false },
  connectTimeout: 10000,
  dateStrings: true   // ✅ return DATETIME columns as plain strings, not JS Date objects
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

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/products", (req, res) => {
  const { name, price } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.query(
    "INSERT INTO products (name,price) VALUES (?,?)",
    [name, price],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Product added",
        id: result.insertId
      });
    }
  );
});

app.delete("/products/:id", (req, res) => {
  db.query("DELETE FROM products WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Product deleted" });
  });
});

/* ===============================
CREATE ORDER
================================= */

app.post("/orders", (req, res) => {
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
    return res.status(400).json({ error: "Missing required fields" });
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
      scheduledAt || null   // ✅ pass the plain string through, no Date() wrapping
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      const orderId = result.insertId;

      if (!items || items.length === 0) {
        return res.json({ message: "Order Saved" });
      }

      const itemSql = `
        INSERT INTO order_items
        (
          order_id,
          item_name,
          quantity,
          price,
          notes
        )
        VALUES ?
      `;

      const values = items.map((i) => [
        orderId,
        i.itemName,
        i.qty,
        i.price,
        i.notes || ""
      ]);

      db.query(itemSql, [values], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Order Saved" });
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
      o.*,
      o.scheduled_at,
      COALESCE(o.scheduled_at, o.created_at) AS queue_time,

      GROUP_CONCAT(
        CONCAT(
          oi.item_name,
          ' x',
          oi.quantity,
          IF(oi.notes IS NOT NULL AND oi.notes != '',
            CONCAT(' (Note: ', oi.notes, ')'),
            ''
          )
        )
        SEPARATOR ', '
      ) AS items

    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status='Pending'
    GROUP BY o.id
    ORDER BY queue_time ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

/* ===============================
GET SALES (Completed Orders)
================================= */

app.get("/sales", (req, res) => {
  const sql = `
    SELECT 
      o.*,
      GROUP_CONCAT(
        CONCAT(
          oi.item_name,
          ' x',
          oi.quantity,
          IF(oi.notes IS NOT NULL AND oi.notes != '',
            CONCAT(' (Note: ', oi.notes, ')'),
            ''
          )
        )
        SEPARATOR ', '
      ) AS items

    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.status='Completed'
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
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
      if (err) return res.status(500).json(err);
      res.json({ message: "Order Completed" });
    }
  );
});

/* ===============================
CANCEL ORDER
================================= */

app.put("/orders/:id/cancel", (req, res) => {
  db.query(
    "UPDATE orders SET status='Cancelled' WHERE id=?",
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json(err);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ message: "Order Cancelled" });
    }
  );
});

/* ===============================
START SERVER
================================= */

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});