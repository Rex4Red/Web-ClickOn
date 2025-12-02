/* server.js - Final Version (Stats + Merch + Events + Auth) */
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());

// [PENTING] Limit Upload Besar (50MB) agar gambar Base64 masuk
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
        res.status(403).json({ message: 'Akses ditolak. Hanya untuk Admin.' });
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

// --- PUBLIC EVENT ROUTES ---

// 1. Ambil Semua Event
app.get('/events', async (req, res) => {
    try { const [rows] = await dbPool.execute('SELECT * FROM events'); res.json(rows); } 
    catch (error) { res.status(500).json({ message: 'Error loading events' }); }
});

// 2. Ambil Detail Satu Event (Untuk Checkout)
app.get('/events/:id', async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Event tidak ditemukan.' });
        res.json(rows[0]);
    } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// --- ADMIN DASHBOARD STATS (SINKRON DB) ---
app.get('/admin/stats', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        // Hitung Total Event
        const [eventRows] = await dbPool.execute('SELECT COUNT(*) as count FROM events');
        const totalEvents = eventRows[0].count;

        // Hitung Tiket Terjual
        const [ticketRows] = await dbPool.execute('SELECT COUNT(*) as count FROM tickets WHERE status IN ("paid", "used")');
        const ticketsSold = ticketRows[0].count;

        // Hitung Total Pendapatan (Tiket * Harga Event)
        const [revenueRows] = await dbPool.execute(`
            SELECT SUM(e.price) as total 
            FROM tickets t 
            JOIN events e ON t.event_id = e.id 
            WHERE t.status IN ("paid", "used")
        `);
        const totalRevenue = revenueRows[0].total || 0;

        // Hitung Total Merchandise
        let totalMerch = 0;
        try {
            const [merchRows] = await dbPool.execute('SELECT SUM(stock) as count FROM merchandise');
            totalMerch = merchRows[0].count || 0;
        } catch (e) { /* Abaikan jika tabel merch belum ada */ }

        res.json({ totalEvents, ticketsSold, totalRevenue, totalMerch });
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: "Gagal memuat statistik." });
    }
});

// --- MERCHANDISE ROUTES ---

// 1. Lihat Semua Merchandise
app.get('/merchandise', async (req, res) => {
    try {
        const query = `SELECT m.*, e.title as event_name FROM merchandise m LEFT JOIN events e ON m.event_id = e.id`;
        const [rows] = await dbPool.execute(query);
        res.json(rows);
    } catch (error) { 
        if(error.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ message: 'Error loading merchandise' }); 
    }
});

// 2. Tambah Merchandise
app.post('/merchandise', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        const { item_name, price, stock, event_id, image_url } = req.body;
        await dbPool.execute(
            'INSERT INTO merchandise (item_name, price, stock, event_id, image_url) VALUES (?, ?, ?, ?, ?)',
            [item_name, price, stock, event_id || null, image_url]
        );
        res.status(201).json({ message: 'Merchandise ditambahkan.' });
    } catch (error) { 
        console.error(error);
        res.status(500).json({ message: 'Gagal tambah merchandise.' }); 
    }
});

// 3. Hapus Merchandise
app.delete('/merchandise/:id', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try {
        await dbPool.execute('DELETE FROM merchandise WHERE id = ?', [req.params.id]);
        res.json({ message: 'Merchandise dihapus.' });
    } catch (error) { res.status(500).json({ message: 'Gagal hapus merchandise.' }); }
});

// --- TRANSAKSI & EVENT MANAGEMENT ---

// Checkout Tiket
app.post('/checkout', authenticateToken, async (req, res) => {
    const { eventId } = req.body;
    const userId = req.user.userId;
    const ticket_code = `CKT-${userId}-${eventId}-${Date.now()}`;

    try {
        // Simpan Tiket
        await dbPool.execute('INSERT INTO tickets (user_id, event_id, ticket_code, status) VALUES (?, ?, ?, ?)', [userId, eventId, ticket_code, 'paid']);
        
        // Ambil Nama Event & User untuk Response
        const [eventRows] = await dbPool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        const [userRows] = await dbPool.execute('SELECT full_name FROM users WHERE id = ?', [userId]);
        
        res.status(201).json({ 
            message: 'Sukses', 
            ticket: { 
                ticketCode: ticket_code,
                eventName: eventRows[0]?.title || 'Event',
                userName: userRows[0]?.full_name || 'User'
            } 
        });
    } catch (e) { res.status(500).json({ message: 'Gagal checkout' }); }
});

// Riwayat Tiket User
app.get('/tickets/history', authenticateToken, async (req, res) => {
    try { const [rows] = await dbPool.execute('SELECT t.ticket_code, t.status, t.purchase_date, e.title, e.venue, e.event_date FROM tickets t JOIN events e ON t.event_id = e.id WHERE t.user_id = ? ORDER BY t.purchase_date DESC', [req.user.userId]); res.json(rows); } catch (e) { res.status(500).json({ message: 'Error history' }); }
});

// Tambah Event (Admin)
app.post('/events', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try { 
        const { title, description, venue, event_date, price, default_category, image_url } = req.body; 
        await dbPool.execute('INSERT INTO events (title, description, venue, event_date, price, default_category, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [title, description, venue, event_date, price, default_category || 'FESTIVAL', image_url || null, 'available']); 
        res.status(201).json({ message: 'Event berhasil ditambahkan.' }); 
    } catch (error) { res.status(500).json({ message: 'Gagal simpan ke database.' }); }
});

// Hapus Event (Force Delete: Hapus tiket terkait dulu)
app.delete('/events/:id', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    const connection = await dbPool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.execute('DELETE FROM tickets WHERE event_id = ?', [req.params.id]);
        try { await connection.execute('DELETE FROM merchandise WHERE event_id = ?', [req.params.id]); } catch(e) {}
        await connection.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
        await connection.commit();
        res.json({ message: 'Event dan data terkait berhasil dihapus.' });
    } catch (e) { 
        await connection.rollback();
        res.status(500).json({ message: 'Gagal hapus event.', error: e.message }); 
    } finally { connection.release(); }
});

// Update Status Event
app.patch('/events/:id/status', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try { await dbPool.execute('UPDATE events SET status = ? WHERE id = ?', [req.body.status, req.params.id]); res.json({ message: 'Status diupdate.' }); } catch (e) { res.status(500).json({ message: 'Gagal update status' }); }
});

// Validasi Tiket (Check-in)
app.post('/tickets/validate', authenticateToken, requireAdminOrPanitia, async (req, res) => {
    try { const [rows] = await dbPool.execute('SELECT id, status, user_id FROM tickets WHERE ticket_code = ?', [req.body.ticketCode]); if (!rows.length) return res.status(404).json({ valid: false, message: 'Tiket tidak ditemukan.' }); if (rows[0].status === 'used') return res.status(400).json({ valid: false, message: 'Tiket sudah dipakai.' }); await dbPool.execute('UPDATE tickets SET status = "used" WHERE id = ?', [rows[0].id]); const [u] = await dbPool.execute('SELECT full_name FROM users WHERE id = ?', [rows[0].user_id]); res.json({ valid: true, message: 'Check-in Sukses', owner: u[0].full_name }); } catch (e) { res.status(500).json({ message: 'Error validasi' }); }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));