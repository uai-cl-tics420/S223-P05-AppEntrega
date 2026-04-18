import mysql, { type RowDataPacket, type ResultSetHeader } from "mysql2/promise";

interface Package extends RowDataPacket {
  id: number;
  recipient_name: string;
  apartment_number: string;
  description: string;
  sender: string;
  delivery_date: string | null;
  status: "received" | "delivered" | "pending";
  created_at: string;
}

async function validateData() {
  let connection: any;
  try {
    // Conectar a la BD
    connection = await mysql.createConnection({
      host: "localhost",
      port: 3306,
      user: "root",
      password: "clave123",
      database: "appdb",
    });

    console.log("\n✅ CONEXIÓN EXITOSA A MYSQL\n");

    // ==========================================
    // 1. LIMPIAR DATOS DE PRUEBAS PREVIAS
    // ==========================================
    console.log("📋 PASO 1: Limpiando datos de pruebas previas...");
    await connection.query("DELETE FROM packages WHERE sender = 'Test Suite'");
    console.log("✅ Tabla limpia\n");

    // ==========================================
    // 2. INSERTAR DATOS DE PRUEBA
    // ==========================================
    console.log("📋 PASO 2: Insertando datos de prueba...");
    
    const testPackages = [
      {
        recipient_name: "Juan García",
        apartment_number: "101",
        description: "Paquete electrónico",
        sender: "Test Suite",
        delivery_date: null,
        status: "received",
      },
      {
        recipient_name: "María López",
        apartment_number: "205",
        description: "Documento importante",
        sender: "Test Suite",
        delivery_date: null,
        status: "received",
      },
      {
        recipient_name: "Carlos Mendez",
        apartment_number: "310",
        description: "Paquete frágil",
        sender: "Test Suite",
        delivery_date: null,
        status: "pending",
      },
      {
        recipient_name: "Ana Rodríguez",
        apartment_number: "420",
        description: "Compra online",
        sender: "Test Suite",
        delivery_date: "2025-04-15 10:30:00",
        status: "delivered",
      },
    ];

    const insertedIds: number[] = [];

    for (const pkg of testPackages) {
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO packages (recipient_name, apartment_number, description, sender, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?)",
        [pkg.recipient_name, pkg.apartment_number, pkg.description, pkg.sender, pkg.delivery_date, pkg.status]
      );
      insertedIds.push(result.insertId);
      console.log(`  ✓ Paquete insertado: ID ${result.insertId} - ${pkg.recipient_name}`);
    }
    console.log(`✅ ${insertedIds.length} paquetes insertados\n`);

    // ==========================================
    // 3. VALIDAR QUE SE GUARDARON EN MYSQL
    // ==========================================
    console.log("📋 PASO 3: Validando que los datos se guardaron correctamente...");
    
    const [allPackages] = await connection.query<Package[]>(
      "SELECT * FROM packages WHERE sender = 'Test Suite' ORDER BY id ASC"
    );

    if (allPackages.length !== insertedIds.length) {
      console.error(`❌ ERROR: Se esperaban ${insertedIds.length} paquetes pero se encontraron ${allPackages.length}`);
      process.exit(1);
    }

    console.log(`✅ Se recuperaron ${allPackages.length} paquetes de la BD\n`);

    console.log("Detalles de paquetes guardados:");
    allPackages.forEach((pkg, index) => {
      console.log(`  ${index + 1}. ID: ${pkg.id}`);
      console.log(`     Destinatario: ${pkg.recipient_name}`);
      console.log(`     Apartamento: ${pkg.apartment_number}`);
      console.log(`     Descripción: ${pkg.description}`);
      console.log(`     Estado: ${pkg.status}`);
      console.log(`     Creado: ${pkg.created_at}`);
      console.log("");
    });

    // ==========================================
    // 4. VALIDAR CAMBIOS DE ESTADO
    // ==========================================
    console.log("📋 PASO 4: Validando cambios de estado...");
    
    const testId = insertedIds[0];
    console.log(`  Probando cambios de estado en paquete ID ${testId}...`);

    // Estado inicial
    const [initialState] = await connection.query<Package[]>(
      "SELECT status FROM packages WHERE id = ?",
      [testId]
    );
    console.log(`  • Estado inicial: ${initialState[0].status}`);

    // Cambiar a "pending"
    await connection.query("UPDATE packages SET status = ? WHERE id = ?", ["pending", testId]);
    const [pendingState] = await connection.query<Package[]>(
      "SELECT status FROM packages WHERE id = ?",
      [testId]
    );
    if (pendingState[0].status !== "pending") {
      console.error("❌ ERROR: No se pudo cambiar a estado 'pending'");
      process.exit(1);
    }
    console.log(`  ✓ Cambio a "pending": OK`);

    // Cambiar a "delivered"
    await connection.query("UPDATE packages SET status = ? WHERE id = ?", ["delivered", testId]);
    const [deliveredState] = await connection.query<Package[]>(
      "SELECT status FROM packages WHERE id = ?",
      [testId]
    );
    if (deliveredState[0].status !== "delivered") {
      console.error("❌ ERROR: No se pudo cambiar a estado 'delivered'");
      process.exit(1);
    }
    console.log(`  ✓ Cambio a "delivered": OK`);

    // Cambiar de vuelta a "received"
    await connection.query("UPDATE packages SET status = ? WHERE id = ?", ["received", testId]);
    const [receivedState] = await connection.query<Package[]>(
      "SELECT status FROM packages WHERE id = ?",
      [testId]
    );
    if (receivedState[0].status !== "received") {
      console.error("❌ ERROR: No se pudo cambiar a estado 'received'");
      process.exit(1);
    }
    console.log(`  ✓ Cambio a "received": OK`);

    console.log("✅ Todos los cambios de estado fueron exitosos\n");

    // ==========================================
    // 5. REVISAR CONSISTENCIA DE DATOS
    // ==========================================
    console.log("📋 PASO 5: Revisando consistencia de datos...");

    // Validar que todos los campos obligatorios están presentes
    const [consistencyCheck] = await connection.query<Package[]>(
      "SELECT id, recipient_name, apartment_number, sender FROM packages WHERE sender = 'Test Suite' AND (recipient_name IS NULL OR apartment_number IS NULL OR sender IS NULL)"
    );

    if (consistencyCheck.length > 0) {
      console.error("❌ ERROR: Se encontraron campos obligatorios vacíos");
      console.error(consistencyCheck);
      process.exit(1);
    }
    console.log("  ✓ Todos los campos obligatorios están presentes");

    // Validar que los estados son válidos
    const [invalidStates] = await connection.query<Package[]>(
      "SELECT id, status FROM packages WHERE sender = 'Test Suite' AND status NOT IN ('received', 'delivered', 'pending')"
    );

    if (invalidStates.length > 0) {
      console.error("❌ ERROR: Se encontraron estados inválidos");
      console.error(invalidStates);
      process.exit(1);
    }
    console.log("  ✓ Todos los estados son válidos (received, pending, delivered)");

    // Validar que los created_at son válidos
    const [invalidDates] = await connection.query<Package[]>(
      "SELECT id, created_at FROM packages WHERE sender = 'Test Suite' AND created_at IS NULL"
    );

    if (invalidDates.length > 0) {
      console.error("❌ ERROR: Se encontraron paquetes sin fecha de creación");
      console.error(invalidDates);
      process.exit(1);
    }
    console.log("  ✓ Todos los paquetes tienen fecha de creación");

    // Contar por estado
    const [statusCounts] = await connection.query<any[]>(
      "SELECT status, COUNT(*) as count FROM packages WHERE sender = 'Test Suite' GROUP BY status"
    );

    console.log("\n  Distribución de estados:");
    statusCounts.forEach((row) => {
      console.log(`    • ${row.status}: ${row.count} paquetes`);
    });

    console.log("✅ Todos los datos son consistentes\n");

    // ==========================================
    // RESUMEN FINAL
    // ==========================================
    console.log("╔════════════════════════════════════════════╗");
    console.log("║  ✅ VALIDACIÓN COMPLETADA EXITOSAMENTE  ║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("\n📊 RESUMEN DE PRUEBAS:");
    console.log(`  ✓ Conexión a MySQL: OK`);
    console.log(`  ✓ Inserción de ${insertedIds.length} paquetes de prueba: OK`);
    console.log(`  ✓ Recuperación de datos de BD: OK`);
    console.log(`  ✓ Cambios de estado (received → pending → delivered → received): OK`);
    console.log(`  ✓ Validación de campos obligatorios: OK`);
    console.log(`  ✓ Validación de estados válidos: OK`);
    console.log(`  ✓ Validación de fechas de creación: OK`);
    console.log(`  ✓ Consistencia de datos: OK\n`);

    await connection.end();
    console.log("🔌 Conexión cerrada\n");

  } catch (error) {
    console.error("\n❌ ERROR EN LA VALIDACIÓN:");
    console.error(error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

validateData();
