import db from "./db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

async function createTables() {
  try {
    // Verificar si la tabla existe
    const [tables] = await db.query<any[]>(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'packages'"
    );

    // Si la tabla existe, eliminarla para recrearla con la estructura correcta
    if (tables.length > 0) {
      await db.query("DROP TABLE IF EXISTS packages");
      console.log("Tabla 'packages' antigua eliminada.");
    }

    // Crear la tabla con la estructura correcta
    await db.query(`
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
    console.log("✅ Tabla 'packages' creada exitosamente.");
  } catch (error) {
    console.error("Error creando tabla:", error);
  }
}

await createTables();

Bun.serve({
  port: 3001,
  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      try {
        const [rows] = await db.query<RowDataPacket[]>("SELECT 1 AS test");

        return Response.json({
          message: "Conexión a MySQL exitosa",
          result: rows,
        });
      } catch (error) {
        return Response.json(
          {
            message: "Error al conectar con MySQL",
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "GET" && url.pathname === "/api/packages") {
      try {
        const [rows] = await db.query<RowDataPacket[]>(
          "SELECT * FROM packages ORDER BY created_at DESC"
        );

        return Response.json({
          packages: rows,
        });
      } catch (error) {
        return Response.json(
          {
            message: "Error obteniendo paquetes",
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "POST" && url.pathname === "/api/packages") {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        const { recipient_name, apartment_number, description, sender, delivery_date, status = "received" } = body;

        if (!recipient_name) {
          return Response.json(
            { error: "recipient_name es requerido" },
            { status: 400 }
          );
        }

        if (!apartment_number) {
          return Response.json(
            { error: "apartment_number es requerido" },
            { status: 400 }
          );
        }

        if (!sender) {
          return Response.json(
            { error: "sender es requerido" },
            { status: 400 }
          );
        }

        const [result] = await db.query<ResultSetHeader>(
          "INSERT INTO packages (recipient_name, apartment_number, description, sender, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?)",
          [recipient_name, apartment_number, description, sender, delivery_date || null, status]
        );

        return Response.json({
          message: "Paquete insertado exitosamente",
          id: result.insertId,
        });
      } catch (error) {
        return Response.json(
          {
            message: "Error insertando paquete",
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "GET" && url.pathname.startsWith("/api/packages/")) {
      try {
        const id = url.pathname.split("/").pop();

        const [rows] = await db.query<RowDataPacket[]>(
          "SELECT * FROM packages WHERE id = ?",
          [id]
        );

        if (rows.length === 0) {
          return Response.json(
            { error: "Paquete no encontrado" },
            { status: 404 }
          );
        }

        return Response.json({
          package: rows[0],
        });
      } catch (error) {
        return Response.json(
          {
            message: "Error obteniendo paquete",
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "PUT" && url.pathname.startsWith("/api/packages/")) {
      try {
        const id = url.pathname.split("/").pop();
        const body = (await request.json()) as Record<string, unknown>;
        const { recipient_name, apartment_number, description, sender, delivery_date, status } = body;

        // Validar que al menos un campo sea proporcionado
        if (!recipient_name && !apartment_number && !description && !sender && !delivery_date && !status) {
          return Response.json(
            { error: "Al menos un campo debe ser proporcionado" },
            { status: 400 }
          );
        }

        // Construir query dinámicamente
        const updates: string[] = [];
        const values: unknown[] = [];

        if (recipient_name) {
          updates.push("recipient_name = ?");
          values.push(recipient_name);
        }
        if (apartment_number) {
          updates.push("apartment_number = ?");
          values.push(apartment_number);
        }
        if (description) {
          updates.push("description = ?");
          values.push(description);
        }
        if (sender) {
          updates.push("sender = ?");
          values.push(sender);
        }
        if (delivery_date) {
          updates.push("delivery_date = ?");
          values.push(delivery_date);
        }
        if (status) {
          updates.push("status = ?");
          values.push(status);
        }

        values.push(id);

        const [result] = await db.query<ResultSetHeader>(
          `UPDATE packages SET ${updates.join(", ")} WHERE id = ?`,
          values
        );

        if (result.affectedRows === 0) {
          return Response.json(
            { error: "Paquete no encontrado" },
            { status: 404 }
          );
        }

        return Response.json({
          message: "Paquete actualizado exitosamente",
          id: id,
        });
      } catch (error) {
        return Response.json(
          {
            message: "Error actualizando paquete",
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    if (request.method === "DELETE" && url.pathname.startsWith("/api/packages/")) {
      try {
        const id = url.pathname.split("/").pop();

        const [result] = await db.query<ResultSetHeader>(
          "DELETE FROM packages WHERE id = ?",
          [id]
        );

        if (result.affectedRows === 0) {
          return Response.json(
            { error: "Paquete no encontrado" },
            { status: 404 }
          );
        }

        return Response.json({
          message: "Paquete eliminado exitosamente",
          id: id,
        });
      } catch (error) {
        return Response.json(
          {
            message: "Error eliminando paquete",
            error: String(error),
          },
          { status: 500 }
        );
      }
    }

    return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
  },
});

console.log("Backend corriendo en http://localhost:3001");