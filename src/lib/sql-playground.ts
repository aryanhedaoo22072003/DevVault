export const SQL_WORKSPACE = 'retail-analytics';
export const SQL_STARTER = `SELECT
  c.name AS customer,
  COUNT(o.id) AS order_count,
  ROUND(SUM(o.total), 2) AS total_spend
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
HAVING SUM(o.total) >= 1000
ORDER BY total_spend DESC;`;

export const SQL_DATASET = [
  'CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL)',
  "INSERT INTO customers VALUES (1,'Asha','Pune'),(2,'Kabir','Mumbai'),(3,'Meera','Bengaluru'),(4,'Rohan','Delhi')",
  'CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, order_date TEXT NOT NULL, total REAL NOT NULL, FOREIGN KEY(customer_id) REFERENCES customers(id))',
  "INSERT INTO orders VALUES (101,1,'2026-01-10',750.0),(102,1,'2026-02-03',400.0),(103,2,'2026-02-14',1200.0),(104,3,'2026-03-01',300.0),(105,2,'2026-03-12',250.0)",
];

export const SQL_SCHEMA = [
  { table: 'customers', columns: ['id INTEGER PK', 'name TEXT', 'city TEXT'], rows: 4 },
  { table: 'orders', columns: ['id INTEGER PK', 'customer_id INTEGER FK', 'order_date TEXT', 'total REAL'], rows: 5 },
];
