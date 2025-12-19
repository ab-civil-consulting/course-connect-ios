import fs from "fs";
import path from "path";
import pool from "./connection";

async function runMigrations() {
  console.log("Running database migrations...");

  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    await pool.query(schema);

    console.log("✅ Database migrations completed successfully!");

    // Insert default categories
    await insertDefaultCategories();

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

async function insertDefaultCategories() {
  console.log("Inserting default categories...");

  const defaultCategories = [
    {
      id: "general",
      name: "General Discussion",
      description: "General topics about videos and the community",
      slug: "general",
      icon: "message-square",
      order: 1,
    },
    {
      id: "announcements",
      name: "Announcements",
      description: "Important updates and announcements",
      slug: "announcements",
      icon: "bell",
      order: 0,
    },
  ];

  for (const category of defaultCategories) {
    try {
      await pool.query(
        `INSERT INTO forum_categories (id, name, description, slug, icon, "order", is_locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [category.id, category.name, category.description, category.slug, category.icon, category.order, false],
      );
      console.log(`✅ Created category: ${category.name}`);
    } catch (error) {
      console.log(`ℹ️ Category ${category.name} already exists, skipping...`);
    }
  }
}

runMigrations();
