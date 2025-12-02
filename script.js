/* script.js - FINAL VERSION (User + Admin + Stats + Merch + Checkout Redirect) */

const API_URL = "http://localhost:3000";

// --- HELPERS ---
function formatRupiah(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// --- 1. NAVIGASI & AUTH (Berjalan di semua halaman) ---
function checkLoginNavbar() {
    const authButton = document.getElementById('auth-button');
    const adminLink = document.getElementById('admin-link');
    const historyLink = document.getElementById('nav-history'); 
    
    const token = localStorage.getItem('clickon_token');
    const userStr = localStorage.getItem('clickon_user');

    if (!authButton) return;

    if (token && userStr) {
        const user = JSON.parse(userStr);
        
        // Tampilkan Menu Riwayat
        if (historyLink) historyLink.classList.remove('hidden');

        // Logic Tombol Dashboard (Admin vs User)
        if (user.role === 'admin' || user.role === 'panitia') {
            if(adminLink) adminLink.classList.remove('hidden');
            authButton.textContent = 'Dashboard Admin';
            authButton.href = 'admin.html';
            authButton.classList.remove('bg-accent', 'text-black');
            authButton.classList.add('bg-zinc-800', 'text-white', 'border', 'border-white/20');
        } else {
            // Tampilkan Nama User
            const displayName = user.fullName || user.full_name || 'User'; 
            authButton.textContent = `Logout (${displayName})`;
            authButton.href = "#"; 
            authButton.classList.remove('bg-accent', 'text-black');
            authButton.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700');
            authButton.onclick = (e) => { e.preventDefault(); logout(); };
        }
    }
}

// --- 2. LOGIKA HALAMAN INDEX (User) ---
async function loadConcerts() {
    const grid = document.getElementById('concert-grid');
    if (!grid) return; 

    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        grid.innerHTML = '';

        if (!events.length) {
            grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Belum ada konser.</p>';
            return;
        }

        events.forEach(event => {
            const date = new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            
            // [FIX PENTING] Tombol diganti menjadi Link <a> agar Redirect ke Checkout
            let actionBtn = `<a href="checkout.html?event_id=${event.id}" class="w-full mt-4 block text-center bg-accent text-black font-bold py-3 rounded-lg transition duration-300 hover:bg-accent-hover">Beli Tiket</a>`;
            
            let badgeClass = "bg-black/70 text-white";
            let badgeText = event.default_category || "General";

            if (event.status === 'sold_out') {
                actionBtn = `<button disabled class="w-full mt-4 block text-center bg-zinc-800 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed border border-white/10">SOLD OUT</button>`;
                badgeClass = "bg-red-600 text-white shadow-lg";
                badgeText = "SOLD OUT";
            }

            const imgUrl = (event.image_url && event.image_url.length > 10) 
                ? event.image_url 
                : 'https://images.unsplash.com/photo-1459749411177-d4a428c37ae5?auto=format&fit=crop&q=80&w=800';

            grid.innerHTML += `
                <div class="bg-zinc-900 rounded-xl overflow-hidden flex flex-col border border-white/10 transition-all duration-300 hover:border-accent/50 hover:shadow-lg group h-full">
                    <div class="w-full h-56 bg-zinc-800 relative overflow-hidden">
                        <img src="${imgUrl}" class="w-full h-full object-cover transition transform group-hover:scale-110 duration-700">
                        <div class="absolute top-4 right-4 ${badgeClass} backdrop-blur px-3 py-1 rounded-full text-xs font-bold border border-white/10">${badgeText}</div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col">
                        <h3 class="text-xl font-bold text-white mb-2 line-clamp-1">${event.title}</h3>
                        <p class="text-gray-400 text-sm mb-1">📍 ${event.venue}</p>
                        <p class="text-gray-400 text-sm mb-4">📅 ${date}</p>
                        <div class="mt-auto pt-4 border-t border-white/10">
                            <p class="text-xs text-gray-500 uppercase font-bold mb-1">Harga Mulai</p>
                            <p class="text-accent text-2xl font-bold">${formatRupiah(event.price)}</p>
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<p class="col-span-full text-center text-red-500">Gagal memuat data.</p>`;
    }
}

// --- 3. LOGIKA HALAMAN HISTORY (User) ---
async function loadUserHistory() {
    const container = document.getElementById('history-list'); 
    if (!container) return; 

    const token = localStorage.getItem('clickon_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/tickets/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 401 || res.status === 403) {
            logout(); return;
        }

        const tickets = await res.json();
        container.innerHTML = '';

        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12 border border-white/10 rounded-xl bg-zinc-900/50">
                    <p class="text-gray-400 mb-4">Belum ada riwayat pembelian.</p>
                    <a href="index.html" class="text-accent font-bold hover:underline">Cari Konser</a>
                </div>
            `;
            return;
        }

        tickets.forEach(t => {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${t.ticket_code}`;
            const statusClass = t.status === 'paid' ? 'text-green-400 bg-green-900/20 border-green-900' : 'text-gray-500 bg-zinc-800 border-zinc-700';
            const statusText = t.status === 'paid' ? 'BERLAKU' : 'SUDAH DIPAKAI';

            container.innerHTML += `
                <div class="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden flex flex-col md:flex-row hover:border-accent/50 transition shadow-lg">
                    <div class="p-6 flex-1">
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h3 class="text-xl font-bold text-white mb-1">${t.title}</h3>
                                <p class="text-accent text-sm font-semibold">📍 ${t.venue}</p>
                            </div>
                            <span class="px-3 py-1 text-xs font-bold border rounded ${statusClass}">${statusText}</span>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-sm text-gray-400 mb-4 border-t border-white/5 pt-4">
                            <div><p class="text-xs uppercase opacity-50 mb-1">Tanggal Event</p><p class="text-white font-medium">📅 ${new Date(t.event_date).toLocaleDateString('id-ID')}</p></div>
                            <div><p class="text-xs uppercase opacity-50 mb-1">Kode Tiket</p><p class="text-white font-mono tracking-wider bg-black/30 p-1 rounded inline-block">${t.ticket_code}</p></div>
                        </div>
                    </div>
                    <div class="bg-white p-4 flex items-center justify-center md:w-48 border-t md:border-t-0 border-white/10">
                        <div class="text-center"><img src="${qrUrl}" alt="QR Code" class="w-28 h-28 mix-blend-multiply opacity-90 mx-auto"><p class="text-[10px] text-black font-bold mt-2">SCAN ME</p></div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = `<div class="col-span-full text-center py-10 text-red-500">Gagal memuat riwayat.</div>`;
    }
}

// --- 4. LOGIKA ADMIN DASHBOARD (Stats, Events, Merch) ---

// A. Load Statistik Dashboard
async function loadDashboardStats() {
    const revEl = document.getElementById('stat-revenue');
    if (!revEl) return;

    try {
        const token = localStorage.getItem('clickon_token');
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const stats = await res.json();

        document.getElementById('stat-revenue').innerText = formatRupiah(stats.totalRevenue);
        document.getElementById('stat-tickets').innerText = stats.ticketsSold;
        document.getElementById('stat-events').innerText = stats.totalEvents;
        document.getElementById('stat-merch').innerText = stats.totalMerch;
    } catch (e) { console.error("Stats fail", e); }
}

// B. Load Merchandise
async function loadMerchandise() {
    const tbody = document.getElementById('merch-table-body');
    if (!tbody) return;

    try {
        const res = await fetch(`${API_URL}/merchandise`);
        const items = await res.json();
        tbody.innerHTML = '';

        if (!items.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-500">Belum ada barang.</td></tr>';
            return;
        }

        items.forEach(item => {
            const eventName = item.event_name || '<span class="text-gray-500">Umum</span>';
            tbody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4 flex items-center gap-3">
                        <div class="w-10 h-10 bg-zinc-800 rounded overflow-hidden">
                            <img src="${item.image_url || ''}" class="w-full h-full object-cover">
                        </div>
                        <span class="font-bold text-white">${item.item_name}</span>
                    </td>
                    <td class="p-4 text-gray-300 text-sm">${eventName}</td>
                    <td class="p-4 text-accent font-mono">${formatRupiah(item.price)}</td>
                    <td class="p-4 text-white">${item.stock}</td>
                    <td class="p-4 text-right">
                        <button onclick="deleteMerch(${item.id})" class="text-red-500 hover:text-white bg-red-500/10 hover:bg-red-600 px-3 py-1 rounded text-xs">Hapus</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

// Helper Dropdown Event di Modal Merch
async function loadEventsForSelect() {
    const select = document.getElementById('merchEventSelect');
    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        select.innerHTML = '<option value="">-- Umum / Tanpa Event --</option>';
        events.forEach(ev => {
            select.innerHTML += `<option value="${ev.id}">${ev.title}</option>`;
        });
    } catch(e){}
}

async function deleteMerch(id) {
    if(!confirm("Hapus barang ini?")) return;
    const token = localStorage.getItem('clickon_token');
    try {
        const res = await fetch(`${API_URL}/merchandise/${id}`, { method: 'DELETE', headers: {'Authorization': `Bearer ${token}`} });
        if(res.ok) { loadMerchandise(); loadDashboardStats(); }
    } catch(e) { alert("Error"); }
}

// C. Load Events Admin
async function loadAdminEvents() {
    const tbody = document.getElementById('events-table-body');
    if (!tbody) return; 

    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        tbody.innerHTML = ''; 

        if (!events.length) return tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-gray-500">Belum ada data.</td></tr>';

        events.forEach(ev => {
            const isSoldOut = ev.status === 'sold_out';
            const statusBadge = isSoldOut 
                ? '<span class="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs border border-red-500/30">SOLD OUT</span>'
                : '<span class="text-green-500 bg-green-500/10 px-2 py-1 rounded text-xs border border-green-500/30">AVAILABLE</span>';
            const nextStatus = isSoldOut ? 'available' : 'sold_out';
            const btnText = isSoldOut ? 'Buka' : 'Tutup';
            
            tbody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5 transition">
                    <td class="p-4 text-gray-500 text-sm">#${ev.id}</td>
                    <td class="p-4 font-bold text-white">${ev.title}</td>
                    <td class="p-4 text-gray-400 text-sm">${new Date(ev.event_date).toLocaleDateString()}</td>
                    <td class="p-4 text-gray-400 text-sm">${ev.venue}</td>
                    <td class="p-4 text-accent font-mono">${formatRupiah(ev.price)}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-right flex justify-end gap-2">
                        <button onclick="toggleEventStatus(${ev.id}, '${nextStatus}')" class="border border-white/20 text-gray-300 hover:text-white px-3 py-1 rounded text-xs transition uppercase font-bold">${btnText}</button>
                        <button onclick="deleteEvent(${ev.id})" class="bg-red-600/10 border border-red-600 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1 rounded text-xs transition uppercase font-bold">Hapus</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) { console.error(err); }
}

async function deleteEvent(id) {
    const token = localStorage.getItem('clickon_token');
    if(!confirm("⚠️ Hapus event ini permanen?")) return;
    try {
        const res = await fetch(`${API_URL}/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) { alert("Terhapus!"); loadAdminEvents(); loadDashboardStats(); }
        else { const d = await res.json(); alert(d.message); }
    } catch (e) { alert("Error koneksi."); }
}

async function toggleEventStatus(id, status) {
    const token = localStorage.getItem('clickon_token');
    try {
        await fetch(`${API_URL}/events/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status })
        });
        loadAdminEvents();
    } catch (e) { alert('Error.'); }
}

// --- 5. FORM HANDLERS (Add Event & Merch) ---

// Helper Base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Add Event Form
const addEventForm = document.getElementById('addEventForm');
if (addEventForm) {
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('clickon_token'); 
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true; btnSubmit.textContent = "Menyimpan...";

        const fileInput = document.getElementById('eventImageFile');
        let imageBase64 = "";
        if (fileInput.files.length > 0) {
            try { imageBase64 = await toBase64(fileInput.files[0]); } 
            catch (err) { alert("Gagal proses gambar."); return; }
        }

        const data = {
            title: document.getElementById('eventTitle').value,
            venue: document.getElementById('eventVenue').value,
            event_date: document.getElementById('eventDate').value,
            price: document.getElementById('eventPrice').value,
            description: document.getElementById('eventDesc').value,
            image_url: imageBase64 
        };

        try {
            const res = await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Berhasil!'); closeModal('eventModal'); loadAdminEvents(); loadDashboardStats(); addEventForm.reset();
            } else {
                const errJson = await res.json(); alert('Gagal: ' + (errJson.message || res.statusText));
            }
        } catch (err) { alert('Error koneksi.'); } 
        finally { btnSubmit.disabled = false; btnSubmit.textContent = "Simpan"; }
    });
}

// Add Merchandise Form
const addMerchForm = document.getElementById('addMerchForm');
if (addMerchForm) {
    addMerchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('clickon_token');
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = "Menyimpan...";

        const fileInput = document.getElementById('merchImageFile');
        let imgBase64 = "";
        if (fileInput.files.length > 0) imgBase64 = await toBase64(fileInput.files[0]);

        const data = {
            item_name: document.getElementById('merchName').value,
            price: document.getElementById('merchPrice').value,
            stock: document.getElementById('merchStock').value,
            event_id: document.getElementById('merchEventSelect').value,
            image_url: imgBase64
        };

        try {
            const res = await fetch(`${API_URL}/merchandise`, {
                method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify(data)
            });
            if(res.ok) { alert("Sukses!"); closeModal('merchModal'); loadMerchandise(); loadDashboardStats(); addMerchForm.reset(); }
            else alert("Gagal");
        } catch(e) { alert("Error"); }
        finally { btn.disabled = false; btn.textContent = "Simpan"; }
    });
}

// Validasi Tiket (Scanner)
async function validateTicket() {
    const code = document.getElementById('ticketCodeInput').value;
    const token = localStorage.getItem('clickon_token');
    const resultDiv = document.getElementById('validationResult');
    if(!code) return alert("Input kode!");
    try {
        const res = await fetch(`${API_URL}/tickets/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ ticketCode: code })
        });
        const d = await res.json();
        resultDiv.innerHTML = res.ok ? `<span class="text-accent">✅ ${d.message}</span>` : `<span class="text-red-500">❌ ${d.message}</span>`;
    } catch(e) {}
}