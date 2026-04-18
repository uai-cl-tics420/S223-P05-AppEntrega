import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "clave123",
  database: "appdb",
});

console.log("Eliminando tabla anterior...");
await connection.query("DROP TABLE IF EXISTS packages");

console.log("Creando tabla nueva...");
await connection.query(`
  CREATE TABLE packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_name VARCHAR(255) NOT NULL,
    apartment_number VARCHAR(50) NOT NULL,
    description TEXT,
    sender VARCHAR(255) NOT NULL,
    delivery_date TIMESTAMP NULL,
    status ENUM('received', 'delivered', 'pending') DEFAULT 'received',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log("✅ Tabla recreada exitosamente");

const [columns] = await connection.query(`DESCRIBE packages`);
console.log("\nEstructura nueva:");
console.table(columns);

await connection.end();
