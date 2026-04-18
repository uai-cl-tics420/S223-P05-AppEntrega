import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "clave123",
  database: "appdb",
});

const [columns] = await connection.query(`DESCRIBE packages`);
console.log("Estructura actual de la tabla 'packages':");
console.table(columns);

await connection.end();
