/* script.js - Logika Terpusat ClickOn */

const API_URL = "http://localhost:3000";

// --- HELPERS ---
function getAuth() {
    const token = localStorage.getItem('clickon_token');
    return token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : null;
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function formatRupiah(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

// 1. LOGIKA NAVBAR (checkLoginNavbar)
function checkLoginNavbar() {
    const authButton = document.getElementById('auth-button');
    const navHistory = document.getElementById('nav-history');
    if (!authButton) return;

    const token = localStorage.getItem('clickon_token');
    const userStr = localStorage.getItem('clickon_user');

    if (token && userStr) {
        const user = JSON.parse(userStr);
        
        // Tampilkan Menu Riwayat
        if (navHistory) navHistory.classList.remove('hidden');

        // Logic Tombol Auth
        if (user.role === 'admin' || user.role === 'panitia') {
            authButton.textContent = 'Dashboard Admin';
            authButton.href = 'admin.html';
            authButton.classList.remove('bg-accent', 'text-black');
            authButton.classList.add('bg-zinc-800', 'text-white', 'border', 'border-white/20');
        } else {
            authButton.textContent = `Logout (${user.full_name || user.fullName || 'User'})`;
            authButton.classList.remove('bg-accent', 'text-black');
            authButton.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700');
            authButton.onclick = (e) => { e.preventDefault(); logout(); };
        }
    }
}

// 2. LOAD KONSER (INDEX) - Support Sold Out
async function loadConcerts() {
    const grid = document.getElementById('concert-grid');
    if (!grid) return;

    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        grid.innerHTML = '';

        if (!events.length) return grid.innerHTML = '<p class="col-span-full text-center text-gray-500">Belum ada konser.</p>';

        events.forEach(event => {
            const date = new Date(event.event_date).toLocaleDateString('id-ID');
            // Cek Status Sold Out
            let btnAction = `<a href="checkout.html?event_id=${event.id}" class="w-full mt-auto block text-center bg-accent text-black font-bold px-5 py-2.5 rounded-lg transition duration-300 hover:bg-accent-hover">Beli Tiket</a>`;
            let statusBadge = `<div class="absolute top-4 right-4 bg-black/70 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">${event.default_category}</div>`;
            
            if (event.status === 'sold_out') {
                btnAction = `<button disabled class="w-full mt-auto block text-center bg-zinc-700 text-gray-500 font-bold px-5 py-2.5 rounded-lg cursor-not-allowed border border-white/5">SOLD OUT</button>`;
                statusBadge = `<div class="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">SOLD OUT</div>`;
            }

            const img = event.image_url || 'https://images.unsplash.com/photo-1459749411177-d4a428c37ae5?auto=format&fit=crop&q=80&w=800';

            grid.innerHTML += `
                <div class="bg-black rounded-xl overflow-hidden flex flex-col border border-white/10 transition-all duration-300 hover:border-accent/70 hover:shadow-lg hover:shadow-accent/10 group">
                    <div class="w-full h-48 bg-zinc-800 relative overflow-hidden">
                        <img src="${img}" class="w-full h-full object-cover transition transform group-hover:scale-110 duration-500">
                        ${statusBadge}
                    </div>
                    <div class="p-6 flex-1 flex flex-col flex-grow">
                        <h3 class="text-xl font-semibold mb-2 text-white line-clamp-2">${event.title}</h3>
                        <p class="text-gray-400 text-sm mb-1 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            ${event.venue}
                        </p>
                        <p class="text-gray-400 text-sm mb-4 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            ${date}
                        </p>
                        <div class="mt-auto pt-4 border-t border-white/10 flex justify-between items-center">
                            <p class="text-accent text-lg font-bold">${formatRupiah(event.price)}</p>
                            ${btnAction}
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        grid.innerHTML = `<p class="col-span-full text-center text-red-500">Gagal memuat: ${e.message}</p>`;
    }
}

// 3. LOAD HISTORY (USER)
async function loadUserHistory() {
    const container = document.getElementById('ticket-list');
    if (!container) return;

    const headers = getAuth();
    if (!headers) return window.location.href = 'login.html';

    try {
        const res = await fetch(`${API_URL}/tickets/history`, { headers });
        if (res.status === 401) return logout();
        
        const tickets = await res.json();
        container.innerHTML = '';

        if (!tickets || tickets.length === 0) {
            container.innerHTML = `<div class="col-span-full text-center py-12 bg-zinc-900/50 rounded-xl border border-white/10"><p class="text-gray-400 mb-2">Anda belum memiliki tiket.</p><a href="index.html" class="text-accent hover:underline">Beli Sekarang</a></div>`;
            return;
        }

        tickets.forEach(t => {
            const valid = t.status === 'paid';
            const statusBadge = valid 
                ? '<span class="text-green-400 bg-green-500/10 px-2 py-1 rounded text-xs border border-green-500/30">BERLAKU</span>'
                : '<span class="text-red-500 bg-red-500/10 px-2 py-1 rounded text-xs border border-red-500/30">SUDAH DIPAKAI</span>';
            const opacity = valid ? '' : 'opacity-60 grayscale';
            const qr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${t.ticket_code}`;

            container.innerHTML += `
                <div class="bg-zinc-900 border border-white/10 rounded-xl flex overflow-hidden ${opacity}">
                    <div class="p-5 flex-1">
                        <h4 class="text-white font-bold text-lg mb-1">${t.event_title || t.title}</h4>
                        <p class="text-gray-400 text-sm mb-3">${t.venue} • ${new Date(t.event_date).toLocaleDateString()}</p>
                        <div class="text-xs bg-black p-1.5 rounded font-mono text-gray-300 inline-block mb-3 border border-white/5">${t.ticket_code}</div>
                        <div>${statusBadge}</div>
                    </div>
                    <div class="bg-white p-3 flex items-center justify-center w-36 border-l border-white/10">
                        <img src="${qr}" class="w-full mix-blend-multiply">
                    </div>
                </div>
            `;
        });
    } catch (e) {
        container.innerHTML = `<p class="col-span-full text-center text-red-500">Gagal memuat history.</p>`;
    }
}

// 4. ADMIN: MANAJEMEN EVENT
async function loadAdminEvents() {
    const tbody = document.getElementById('admin-event-list');
    if (!tbody) return;
    const headers = getAuth();
    if (!headers) return;

    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        tbody.innerHTML = '';

        if (!events.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Belum ada event.</td></tr>';
            return;
        }

        events.forEach(ev => {
            const isSold = ev.status === 'sold_out';
            const statusColor = isSold ? 'text-red-500' : 'text-green-500';
            const toggleAction = isSold ? 'available' : 'sold_out';
            const toggleText = isSold ? 'Set Available' : 'Set Sold Out';

            tbody.innerHTML += `
                <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="px-6 py-4 font-bold text-white">${ev.title}</td>
                    <td class="px-6 py-4 text-gray-400">${new Date(ev.event_date).toLocaleDateString()}</td>
                    <td class="px-6 py-4 font-bold ${statusColor}">${(ev.status || 'available').toUpperCase()}</td>
                    <td class="px-6 py-4 text-right space-x-2">
                        <button onclick="toggleStatus(${ev.id}, '${toggleAction}')" class="text-xs border border-white/20 px-2 py-1 rounded hover:bg-white/10 text-gray-300 uppercase">${toggleText}</button>
                        <button onclick="deleteEvent(${ev.id})" class="text-xs bg-red-600/10 text-red-500 px-2 py-1 rounded hover:bg-red-600 hover:text-white uppercase">Hapus</button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

async function deleteEvent(id) {
    if (!confirm('Yakin ingin menghapus event ini?')) return;
    try {
        const res = await fetch(`${API_URL}/events/${id}`, { method: 'DELETE', headers: getAuth() });
        const d = await res.json();
        if (res.ok) { alert(d.message); loadAdminEvents(); loadDashboardStats(); }
        else alert(d.message);
    } catch (e) { alert('Error koneksi.'); }
}

async function toggleStatus(id, status) {
    try {
        await fetch(`${API_URL}/events/${id}/status`, { 
            method: 'PATCH', 
            headers: getAuth(), 
            body: JSON.stringify({ status }) 
        });
        loadAdminEvents();
    } catch (e) { alert('Error koneksi.'); }
}

// 5. OTHER (Merch, Dashboard, Checkin)
async function loadEventsToDropdown() {
    const dropdown = document.getElementById('eventSelect');
    if (!dropdown) return;
    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        events.forEach(e => {
            const opt = document.createElement('option');
            opt.value = e.id;
            opt.text = e.title;
            dropdown.add(opt);
        });
    } catch (e) {}
}

async function loadMerchandise(eventId) {
    const container = document.getElementById('merchList');
    if (!container || !eventId) return;
    container.innerHTML = '<p class="text-center col-span-full text-gray-500">Memuat...</p>';
    try {
        const res = await fetch(`${API_URL}/events/${eventId}/merchandise`);
        const items = await res.json();
        container.innerHTML = '';
        if (!items.length) return container.innerHTML = '<p class="text-center col-span-full text-gray-500">Kosong.</p>';
        items.forEach(item => {
            container.innerHTML += `
                <div class="bg-zinc-900 border border-white/10 rounded-xl p-4 hover:border-accent/50 transition">
                    <h4 class="text-white font-bold text-lg">${item.item_name}</h4>
                    <p class="text-accent font-bold text-xl mb-2">${formatRupiah(item.price)}</p>
                    <p class="text-xs text-gray-500 mb-3">Stok: ${item.stock}</p>
                    <button onclick="buyMerch(${item.id})" class="w-full bg-white text-black font-bold py-2 rounded hover:bg-gray-200">Beli</button>
                </div>`;
        });
    } catch (e) { container.innerHTML = '<p class="text-red-500">Gagal memuat.</p>'; }
}

async function buyMerch(id) {
    const token = localStorage.getItem('clickon_token');
    if (!token) return alert('Login dulu.');
    const qty = prompt("Jumlah:", "1");
    if (!qty) return;
    try {
        const res = await fetch(`${API_URL}/merchandise/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ merchandiseId: id, quantity: parseInt(qty) })
        });
        const d = await res.json();
        if (res.ok) { alert("Sukses!"); loadMerchandise(document.getElementById('eventSelect').value); }
        else alert(d.message);
    } catch (e) { alert("Error."); }
}

async function loadDashboardStats() {
    if (!document.getElementById('totalTicketSold')) return;
    const headers = getAuth();
    if (!headers) return;
    try {
        const res = await fetch(`${API_URL}/admin/dashboard/summary`, { headers });
        const d = await res.json();
        if(res.ok) {
            document.getElementById('totalTicketSold').innerText = d.ticketSales.count;
            document.getElementById('totalTicketRev').innerText = formatRupiah(d.ticketSales.revenue);
            document.getElementById('totalUsers').innerText = d.audience.registeredUsers;
        }
    } catch (e) {}
}

const addForm = document.getElementById('addEventForm');
if(addForm) {
    addForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const headers = getAuth();
        const body = {
            title: document.getElementById('eventTitle').value,
            venue: document.getElementById('eventVenue').value,
            event_date: document.getElementById('eventDate').value,
            price: document.getElementById('eventPrice').value,
            description: document.getElementById('eventDesc').value
        };
        await fetch(`${API_URL}/events`, { method: 'POST', headers, body: JSON.stringify(body) });
        alert('Event Ditambahkan');
        loadAdminEvents();
    });
}

async function validateTicket() {
    const code = document.getElementById('checkinCode').value;
    const resBox = document.getElementById('checkinResult');
    const headers = getAuth();
    if(!code) return alert('Input Kode!');
    try {
        const res = await fetch(`${API_URL}/tickets/validate`, { method: 'POST', headers, body: JSON.stringify({ ticketCode: code }) });
        const d = await res.json();
        resBox.classList.remove('hidden', 'bg-green-500/20', 'text-green-400', 'bg-red-500/20', 'text-red-400');
        resBox.style.display = 'block';
        if(d.valid) {
            resBox.classList.add('bg-green-500/20', 'text-green-400');
            resBox.innerHTML = `✅ VALID: ${d.owner}`;
        } else {
            resBox.classList.add('bg-red-500/20', 'text-red-400');
            resBox.innerHTML = `❌ ${d.message}`;
        }
    } catch (e) { alert("Error koneksi."); }
}