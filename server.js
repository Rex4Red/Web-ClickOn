// server.js (Versi BARU dengan API Tiket)
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- Konfigurasi Database ---
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'clickon_db'
});

const JWT_SECRET = 'RAHASIA_INI_HARUS_DIJAGA_DENGAN_SANGAT_BAIK';

// === MIDDLEWARE BARU: Proteksi API ===
// Fungsi ini akan memeriksa token di setiap request yang kita proteksi
const authenticateToken = (req, res, next) => {
    // Ambil token dari header 'Authorization'
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formatnya: "Bearer TOKEN"

    if (token == null) {
        // 401 Unauthorized
        return res.status(401).json({ message: 'Token tidak ditemukan.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // 403 Forbidden (token tidak valid/expired)
            return res.status(403).json({ message: 'Token tidak valid.' });
        }
        
        // Simpan data user dari token ke object request
        req.user = user; 
        next(); // Lanjutkan ke endpoint
    });
};


/*
 * API Endpoint: Mengambil semua data event (konser)
 * (Diperbarui untuk menyertakan harga)
 */
app.get('/events', async (req, res) => {
    try {
        const [rows] = await dbPool.execute(
            'SELECT id, title, venue, event_date, price, default_category FROM events'
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/*
 * API Endpoint BARU: Mengambil detail SATU event
 */
app.get('/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const [rows] = await dbPool.execute(
            'SELECT id, title, price, default_category FROM events WHERE id = ?',
            [eventId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Event tidak ditemukan.' });
        }

        res.json(rows[0]); // Kirim data event
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/*
 * API Endpoint BARU: Checkout / Buat Tiket (TERPROTEKSI)
 */
app.post('/checkout', authenticateToken, async (req, res) => {
    // Kita bisa ambil userId dari 'authenticateToken'
    const userId = req.user.userId;
    const { eventId } = req.body;

    if (!eventId) {
        return res.status(400).json({ message: 'Event ID wajib diisi.' });
    }

    try {
        // 1. Buat kode tiket unik (Contoh sederhana)
        const ticket_code = `CKT-${userId}-${eventId}-${Date.now()}`;
        
        // 2. Simpan tiket baru ke database
        await dbPool.execute(
            'INSERT INTO tickets (user_id, event_id, ticket_code, status) VALUES (?, ?, ?, ?)',
            [userId, eventId, ticket_code, 'paid'] // Langsung anggap lunas (simulasi)
        );

        // 3. Ambil data lengkap untuk dikirim balik (opsional tapi bagus)
        const [eventData] = await dbPool.execute('SELECT title FROM events WHERE id = ?', [eventId]);
        const [userData] = await dbPool.execute('SELECT full_name FROM users WHERE id = ?', [userId]);

        // 4. Kirim data tiket baru ke front-end
        res.status(201).json({
            message: 'Tiket berhasil dibuat!',
            ticket: {
                ticketCode: ticket_code,
                eventName: eventData[0].title,
                userName: userData[0].full_name
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


/*
 * API Endpoint: Registrasi Pengguna Baru
 */
app.post('/register', async (req, res) => {
    // ... (Kode registrasi Anda tetap sama)
    try {
        const { email, password, full_name } = req.body;
        if (!email || !password || !full_name) {
            return res.status(400).json({ message: 'Email, password, dan nama lengkap wajib diisi.' });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        await dbPool.execute(
            'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
            [email, password_hash, full_name, 'penonton']
        );
        res.status(201).json({ message: 'Registrasi berhasil!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email sudah terdaftar.' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


/*
 * API Endpoint: Login Pengguna
 */
app.post('/login', async (req, res) => {
    // ... (Kode login Anda tetap sama)
    try {
        const { email, password } = req.body;
        const [rows] = await dbPool.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.json({ 
            message: 'Login berhasil!', 
            token: token,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Menjalankan server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server ClickOn API berjalan di http://localhost:${PORT}`);
});