# 🔍 LewisFind: Campus Lost & Found Tracking System

🌐 **Live Demo (frontend):** https://lost-and-found-system-phi.vercel.app/

A premium, cinematic, web-based Lost & Found application for **The Lewis College**.
Built with **ReactJS, Tailwind CSS, Node.js + Express, and MySQL**.

> The hosted demo serves the frontend only. For the full system (login, database, uploads), run it locally using the steps below.

---

## 🚦 Project Status

### ✅ Phase 1 & 2: Frontend UI & Events
- [x] React + Vite + Tailwind CSS v4 setup
- [x] Cinematic dark theme (TLC Royal Blue and glassmorphism)
- [x] Login and Register pages with `onSubmit` handling
- [x] Responsive sidebar and top navbar with active routing states
- [x] Report Lost and Report Found forms with real-time validation
- [x] Drag-and-drop image upload with instant preview
- [x] Search page with live filtering by category, location and date
- [x] Admin dashboard for verifying claims
- [x] React Router DOM fully configured

### ✅ Phase 3 & 4: Backend & Database
- [x] MySQL (via XAMPP) database `lewisfind_db` with tables: `users`, `items`, `claims`, `item_photos`, `notifications`
- [x] Node.js + Express REST API (replaced the original PHP plan)
- [x] JWT authentication with bcrypt password hashing
- [x] Role-based access control (student and admin)
- [x] File uploads with multer
- [x] All React `fetch()` calls connected to the live API
- [x] Search returns real database items

### ✅ Phase 5 & 6: Polish & Defense Prep
- [x] Toast notifications for success and error states
- [x] Notification bell with unread count (polls every 30 seconds)
- [x] Claim verification panel (custody record vs. claimant proof)
- [x] Auto-rejection of competing claims when one is approved
- [x] Inventory management with quick-log for walk-ins
- [x] Lost-to-found manual linker for staff
- [x] Aging and retention queue (items held 30+ days)
- [x] Full claims log with per-user history badges
- [x] Edit and delete items from inventory
- [x] Manual status override (mark or unmark returned)

### 🔮 Phase 7: Future Enhancements (Optional)
- [ ] Forgot Password page and password reset
- [ ] Keyboard shortcuts (Enter to search, Escape to close modals)
- [ ] Framer Motion page transitions
- [ ] Real-time notifications via WebSocket (currently polling)
- [ ] Item detail page (`/items/:id`) with full photo gallery
- [ ] Admin user management page
- [ ] Search autocomplete and fuzzy matching
- [ ] Mobile PWA support

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router DOM v7 |
| Backend | Node.js + Express |
| Database | MySQL (MariaDB via XAMPP) |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File uploads | multer |
| Design | Custom dark cinematic UI (TLC Blue `#2A5CFF`) |

---

## ✨ Features

### 👤 Students
- **Register / Login** with hashed passwords
- **Report Lost Item** with a secret verification detail only staff can see
- **Report Found Item** with live matching against existing lost reports
- **Search & Browse** with category, location and date filters and a quick-view modal
- **Claim an Item** with proof of ownership, an optional image and an honesty declaration
- **My Claims** to track pending, approved and rejected claims
- **Notification Bell** for claim updates and possible matches

### 🛡️ Admins
- **Overview and Pending Claims** with KPI cards
- **Verification Panel** to approve, reject (with reason) or mark as returned
- **Auto-Rejection** of competing pending claims on approval
- **Inventory Management** with filters, inline status changes, edit and delete
- **Quick Log** for walk-in found items
- **Lost ↔ Found Linker** to pair reports manually
- **Aging and Retention** with bulk archive for items held 30+ days
- **Claims Log** with per-user history for fraud detection

---

## 📁 Project Structure

```
lost-and-found-system/
├── public/          Static assets
├── scripts/         Helper scripts (one-shot setup)
├── server/          Express API, database code and uploads
├── src/             React app (pages, components, routes)
├── index.html       Vite entry
├── vite.config.js   Vite configuration
├── vercel.json      Vercel deployment config
└── package.json     Dependencies and npm scripts
```

---

## 💻 Run Locally

### Prerequisites
- [Node.js 18+](https://nodejs.org)
- [XAMPP](https://www.apachefriends.org) (only MySQL is needed)
- [Git](https://git-scm.com)

### 1. Start MySQL
Open the XAMPP Control Panel and start **MySQL**. Leave Apache off; the Express server handles everything else.

### 2. Clone and install
```bash
git clone https://github.com/blamelui/lost-and-found-system.git
cd lost-and-found-system
npm install
```

### 3. One-time setup
```bash
npm run setup
```
This creates the `.env` file (with a random `JWT_SECRET`), the `server/uploads/` folder, the `lewisfind_db` database, all tables and the admin account. The admin login is printed in the terminal when setup finishes.

If it cannot connect to MySQL, make sure XAMPP MySQL is green. If your root user has a password, set `DB_PASSWORD` in `.env`.

### 4. Start the system
```bash
npm run dev:all
```
- API: http://localhost:5000
- App: http://localhost:5173

To run them separately: `npm run server` (backend) and `npm run dev` (frontend).

### Start over with a fresh database
```powershell
cd C:\xampp\mysql\bin
.\mysql -u root -e "DROP DATABASE IF EXISTS lewisfind_db;"
cd path\to\lost-and-found-system
Remove-Item .env
npm run setup
```
This wipes all data.

---

## 🔐 Notes
- `.env` is never committed. Change the default admin password before any public demo.
- Notifications currently refresh by polling every 30 seconds.
- The "Forgot password" link is not connected to a page yet.

---

## 👥 Team

- Artuz Champ Lui Guerrero
- Camille Intia
- Johndell Escoto

---

*Event-Driven Programming Mini Capstone, The Lewis College.*
