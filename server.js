const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'clickon_db'
});

const JWT_SECRET = 'RAHASIA_INI_HARUS_DIJAGA_DENGAN_SANGAT_BAIK';

// === MIDDLEWARE ===
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Token tidak ditemukan.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Token tidak valid.' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'panitia')) {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak. Khusus Admin.' });
    }
};

// ======================= API PUBLIC & AUTH =======================

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await dbPool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ message: 'Login sukses', token, user: { id: user.id, fullName: user.full_name, role: user.role } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await dbPool.execute('INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)', [email, hash, full_name, 'penonton']);
        res.status(201).json({ message: 'Registrasi berhasil' });
    } catch (e) { res.status(500).json({ message: 'Gagal registrasi: ' + e.message }); }
});

app.get('/events', async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT * FROM events ORDER BY event_date ASC');
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/events/:id', async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT * FROM events WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Event tidak ditemukan' });
        res.json(rows[0]);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/events/:id/merchandise', async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT * FROM merchandise WHERE event_id = ?', [req.params.id]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ======================= API TRANSAKSI =======================

app.post('/checkout', authenticateToken, async (req, res) => {
    const { eventId } = req.body;
    try {
        const [evt] = await dbPool.execute('SELECT status FROM events WHERE id = ?', [eventId]);
        if (evt.length && evt[0].status === 'sold_out') {
            return res.status(400).json({ message: 'Maaf, tiket sudah habis (Sold Out).' });
        }

        const code = `CKT-${req.user.userId}-${eventId}-${Date.now()}`;
        await dbPool.execute('INSERT INTO tickets (user_id, event_id, ticket_code, status) VALUES (?, ?, ?, "paid")', [req.user.userId, eventId, code]);
        res.json({ message: 'Sukses', ticket: { ticketCode: code } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/merchandise/buy', authenticateToken, async (req, res) => {
    const { merchandiseId, quantity } = req.body;
    const conn = await dbPool.getConnection();
    try {
        await conn.beginTransaction();
        const [items] = await conn.execute('SELECT price, stock FROM merchandise WHERE id = ? FOR UPDATE', [merchandiseId]);
        if (!items.length || items[0].stock < quantity) throw new Error('Stok habis.');
        
        await conn.execute('UPDATE merchandise SET stock = stock - ? WHERE id = ?', [quantity, merchandiseId]);
        await conn.execute('INSERT INTO merchandise_transactions (user_id, merchandise_id, quantity, total_price) VALUES (?, ?, ?, ?)', [req.user.userId, merchandiseId, quantity, items[0].price * quantity]);
        await conn.commit();
        res.json({ message: 'Pembelian berhasil', details: { totalPrice: items[0].price * quantity } });
    } catch (e) { await conn.rollback(); res.status(400).json({ message: e.message }); } finally { conn.release(); }
});

app.get('/tickets/history', authenticateToken, async (req, res) => {
    try {
        const [rows] = await dbPool.execute(`
            SELECT t.ticket_code, t.status, t.purchase_date, e.title, e.venue, e.event_date 
            FROM tickets t JOIN events e ON t.event_id = e.id 
            WHERE t.user_id = ? ORDER BY t.purchase_date DESC`, [req.user.userId]);
        res.json(rows);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// ======================= API ADMIN =======================

app.get('/admin/dashboard/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [t] = await dbPool.execute("SELECT COUNT(id) as c, COALESCE(SUM(price),0) as r FROM events JOIN tickets ON events.id = tickets.event_id WHERE tickets.status IN ('paid','used')");
        const [u] = await dbPool.execute("SELECT COUNT(id) as c FROM users WHERE role='penonton'");
        res.json({ ticketSales: { count: t[0].c, revenue: t[0].r }, audience: { registeredUsers: u[0].c } });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/events', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, venue, event_date, price, description } = req.body;
        await dbPool.execute('INSERT INTO events (title, venue, event_date, price, description, status) VALUES (?, ?, ?, ?, ?, "available")', [title, venue, event_date, price, description]);
        res.json({ message: 'Event dibuat' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/events/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await dbPool.execute('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ message: 'Event berhasil dihapus.' });
    } catch (e) {
        if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(400).json({ message: 'Gagal: Event ini sudah ada pembelinya.' });
        res.status(500).json({ message: e.message });
    }
});

app.patch('/events/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body; 
        await dbPool.execute('UPDATE events SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: `Status diubah ke ${status}` });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/tickets/validate', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await dbPool.execute('SELECT id, status, user_id FROM tickets WHERE ticket_code = ?', [req.body.ticketCode]);
        if (!rows.length) return res.status(404).json({ valid: false, message: 'Tidak Ditemukan' });
        if (rows[0].status === 'used') return res.status(400).json({ valid: false, message: 'Sudah Dipakai' });
        
        await dbPool.execute('UPDATE tickets SET status="used" WHERE id=?', [rows[0].id]);
        const [u] = await dbPool.execute('SELECT full_name FROM users WHERE id=?', [rows[0].user_id]);
        res.json({ valid: true, owner: u[0].full_name });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

app.listen(3000, () => console.log('Server berjalan di port 3000'));