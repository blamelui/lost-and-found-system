// scripts/setup.js
// One-shot setup: creates .env, uploads folder, database, tables, and admin account.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const ENV_PATH = path.join(projectRoot, '.env');
const UPLOADS_DIR = path.join(projectRoot, 'server', 'uploads');

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@lewiscollege.edu.ph';
const ADMIN_PASSWORD = 'Admin@2026!';

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

async function ensureEnvFile() {
  if (fs.existsSync(ENV_PATH)) {
    log('✓', '.env already exists — skipping');
    return;
  }
  const envContent = `DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_NAME=lewisfind_db
DB_PORT=3306
PORT=5000
JWT_SECRET=${Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)}
`;
  fs.writeFileSync(ENV_PATH, envContent, 'utf8');
  log('✓', 'Created .env (with random JWT_SECRET)');
}

function ensureUploadsFolder() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    log('✓', 'Created server/uploads/');
  } else {
    log('✓', 'server/uploads/ already exists');
  }
  const keepFile = path.join(UPLOADS_DIR, '.gitkeep');
  if (!fs.existsSync(keepFile)) {
    fs.writeFileSync(keepFile, '');
  }
}

async function setupDatabase() {
  const dbConfig = {
    host: '127.0.0.1',
    user: 'root',
    password: process.env.DB_PASSWORD || '',
    port: 3306,
    multipleStatements: true,
  };

  log('…', 'Connecting to MySQL on 127.0.0.1:3306 as root…');
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
  } catch (err) {
    console.error('\n❌ Cannot connect to MySQL.');
    console.error('   Make sure XAMPP Control Panel → MySQL is started (green).');
    console.error('   If your root user has a password, edit .env and set DB_PASSWORD=…, then rerun.');
    console.error(`   Error: ${err.code || err.message}\n`);
    process.exit(1);
  }

  log('✓', 'Connected to MySQL');

  await conn.query('CREATE DATABASE IF NOT EXISTS lewisfind_db CHARACTER SET utf8mb4');
  log('✓', 'Database lewisfind_db ready');

  await conn.query('USE lewisfind_db');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      full_name VARCHAR(100) NULL,
      student_id VARCHAR(50) NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('student','admin') NOT NULL DEFAULT 'student',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(100) NOT NULL,
      brand VARCHAR(100) NULL,
      color VARCHAR(50) NULL,
      color_pill VARCHAR(30) NULL,
      category VARCHAR(50) NULL,
      category_other VARCHAR(100) NULL,
      description TEXT NULL,
      image_url VARCHAR(255) NULL,
      storage_location VARCHAR(120) NULL,
      private_notes TEXT NULL,
      last_location VARCHAR(150) NULL,
      lost_at DATETIME NULL,
      urgency ENUM('low','normal','high') NOT NULL DEFAULT 'normal',
      reporter_role ENUM('student','parent','staff') NOT NULL DEFAULT 'student',
      contact_pref ENUM('email','student_id') NOT NULL DEFAULT 'email',
      status ENUM('lost','found','claimed') NOT NULL DEFAULT 'lost',
      photo_blur TINYINT(1) NOT NULL DEFAULT 0,
      custody ENUM('office','self') NOT NULL DEFAULT 'self',
      dropoff_location VARCHAR(100) NULL,
      tag_number VARCHAR(50) NULL,
      secret_detail VARCHAR(255) NULL,
      anonymous TINYINT(1) NOT NULL DEFAULT 0,
      linked_lost_id INT NULL,
      returned_at DATETIME NULL,
      archived_at DATETIME NULL,
      pickup_instructions VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS claims (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      claimant_id INT NOT NULL,
      proof TEXT NULL,
      phone VARCHAR(30) NULL,
      lost_context VARCHAR(255) NULL,
      supporting_image_url VARCHAR(255) NULL,
      reject_reason VARCHAR(255) NULL,
      claim_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('pending','approved','rejected') DEFAULT 'pending',
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS item_photos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      item_id INT NOT NULL,
      url VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      body TEXT NULL,
      link VARCHAR(200) NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  log('✓', 'Tables ready (users, items, claims, item_photos, notifications)');

  // Create admin account if missing
  const [existing] = await conn.query('SELECT id FROM users WHERE username = ?', [ADMIN_USERNAME]);
  if (existing.length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await conn.query(
      `INSERT INTO users (username, full_name, student_id, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'admin')`,
      [ADMIN_USERNAME, 'Site Administrator', 'ADMIN-001', ADMIN_EMAIL, hash]
    );
    log('✓', `Admin account created (${ADMIN_USERNAME} / ${ADMIN_PASSWORD})`);
  } else {
    // Ensure it's role = admin
    await conn.query(`UPDATE users SET role='admin' WHERE username = ?`, [ADMIN_USERNAME]);
    log('✓', `Admin account already exists — role confirmed as admin`);
  }

  await conn.end();
}

async function main() {
  console.log('\n🔧  LewisFind — one-shot setup\n');

  await ensureEnvFile();
  ensureUploadsFolder();

  // Load DB_PASSWORD from .env if present
  if (fs.existsSync(ENV_PATH)) {
    const envText = fs.readFileSync(ENV_PATH, 'utf8');
    const m = envText.match(/^DB_PASSWORD=(.*)$/m);
    if (m) process.env.DB_PASSWORD = m[1].trim();
  }

  await setupDatabase();

  console.log('\n✅  Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Open XAMPP Control Panel → make sure MySQL is running');
  console.log('  2. Run:  npm run dev:all');
  console.log('  3. Open: http://localhost:5173');
  console.log('  4. Log in as:  admin / Admin@2026!\n');
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});