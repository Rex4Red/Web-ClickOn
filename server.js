/* server.js - Final Fix dengan Body Parser */
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
// Tambahkan ini untuk memaksa limit upload
const bodyParser = require('body-parser'); 

const app = express();
app.use(cors());

// [PENTING] Paksa limit 50MB menggunakan body-parser
// Ini mengatasi masalah gambar 340KB yang dianggap "Too Large" (karena defaultnya cuma 100KB)
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// --- Konfigurasi Database ---
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', 
    database: 'clickon_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const JWT_SECRET = 'RAHASIA_INI_HARUS_DIJAGA_DENGAN_SANGAT_BAIK';

// --- Middlewares ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.status(401).json({ message: 'Token tidak ditemukan.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token tidak valid.' });
        req.user = user;
        next();
    });
};

const requireAdminOrPanitia = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'panitia')) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak.' });
    }
};

// --- AUTH ROUTES ---

app.post('/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        await dbPool.execute('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)', [email, password_hash, full_name, 'penonton']);
        res.status(201).json({ message: 'Registrasi berhasil!' });
    } catch (error) { res.status(500).json({ message: 'Error register', error: error.message }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await dbPool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Email/Password salah.' });

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: 'Login berhasil!', token, user: { id: user.id, fullName: user.full_name, role: user.role } });
    } catch (error) { res.status(500).json({ message: 'Error login', error: error.message }); }
});

// --- PUBLIC ROUTES ---

app.get('/events', async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT id, title, description, venue, event_date, price, default_category, image_url, status FROM events');
        res.json(rows);
    } catch (error) { 
        console.error("GET Events Error:", error);
        res.status(500).json({ message: 'Error loading events' }); 
    }
});

app.post('/checkout', authenticateToken, async (req, res) => {
    const { eventId } = req.body;
    const ticket_code = `CKT-${req.user.userId}-${eventId}-${Date.now()}`;
    try {
        await dbPool.execute('INSERT INTO tickets (user_id, event_id, ticket_code, status) VALUES (?, ?, ?, ?)', [req.user.userId, eventId, ticket_code, 'paid']);
        res.status(201).json({ message: 'Sukses', ticket: { ticketCode: ticket_code } });
    } catch (e) { res.status(500).json({ message: 'Gagal checkout' }); }
});

app.get('/tickets/history', authenticateToken, async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT t.ticket_code, t.status, t.purchase_date, e.title, e.venue, e.event_date FROM tickets t JOIN events e ON t.event_id = e.id WHERE t.user_id = ? ORDER BY t.purchase_date DESC', [req.user.userId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: 'Error history' }); }
});

// --- ADMIN ROUTES ---

// 1. TAMBAH EVENT (DEBUGGING)
app.post('/events', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        const { title, description, venue, event_date, price, default_category, image_url } = req.body;
        
        console.log(`[DEBUG] Menerima data event: ${title}`);
        if(image_url) console.log(`[DEBUG] Ukuran gambar diterima: ${Math.round(image_url.length/1024)} KB`);

        // INSERT dengan image_url
        await dbPool.execute(
            'INSERT INTO events (title, description, venue, event_date, price, default_category, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, venue, event_date, price, default_category || 'FESTIVAL', image_url || null, 'available']
        );
        res.status(201).json({ message: 'Event berhasil ditambahkan.' });
    } catch (error) { 
        console.error("[ERROR] Gagal Insert DB:", error); 
        // Cek error packet size MySQL
        if (error.code === 'ER_NET_PACKET_TOO_LARGE') {
            return res.status(500).json({ message: 'Gambar terlalu besar untuk Database MySQL (Cek max_allowed_packet).' });
        }
        res.status(500).json({ message: 'Gagal simpan ke database: ' + error.message }); 
    }
});

// 2. HAPUS EVENT
app.delete('/events/:id', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        await dbPool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ message: 'Event berhasil dihapus.' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Gagal hapus.', error: e.message });
    }
});

// 3. UPDATE STATUS
app.patch('/events/:id/status', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        await dbPool.execute('UPDATE events SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ message: 'Status diupdate.' });
    } catch (e) { res.status(500).json({ message: 'Gagal update status' }); }
});

app.post('/tickets/validate', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT id, status, user_id FROM tickets WHERE ticket_code = ?', [req.body.ticketCode]);
        if (!rows.length) return res.status(404).json({ valid: false, message: 'Tiket tidak ditemukan.' });
        if (rows[0].status === 'used') return res.status(400).json({ valid: false, message: 'Tiket sudah dipakai.' });
        
        await dbPool.execute('UPDATE tickets SET status = "used" WHERE id = ?', [rows[0].id]);
        const [u] = await dbPool.execute('SELECT full_name FROM users WHERE id = ?', [rows[0].user_id]);
        res.json({ valid: true, message: 'Check-in Sukses', owner: u[0].full_name });
    } catch (e) { res.status(500).json({ message: 'Error validasi' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server ClickOn berjalan di http://localhost:${PORT}`));