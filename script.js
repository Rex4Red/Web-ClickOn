/* script.js - Full Code dengan Error Handling Lebih Baik */

const API_URL = "http://localhost:3000";

function formatRupiah(n) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

function checkLoginNavbar() {
    const authButton = document.getElementById('auth-button');
    const adminLink = document.getElementById('admin-link');
    const token = localStorage.getItem('clickon_token');
    const userStr = localStorage.getItem('clickon_user');

    if (!authButton) return;

    if (token && userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'admin' || user.role === 'panitia') {
            if(adminLink) adminLink.classList.remove('hidden');
            authButton.textContent = 'Dashboard Admin';
            authButton.href = 'admin.html';
            authButton.classList.remove('bg-accent', 'text-black');
            authButton.classList.add('bg-zinc-800', 'text-white', 'border', 'border-white/20');
        } else {
            authButton.textContent = `Logout (${user.full_name || 'User'})`;
            authButton.classList.remove('bg-accent', 'text-black');
            authButton.classList.add('bg-red-600', 'text-white', 'hover:bg-red-700');
            authButton.onclick = (e) => { e.preventDefault(); logout(); };
        }
    }
}

async function loadConcerts() {
    const grid = document.getElementById('concert-grid');
    if (!grid) return; 

    try {
        const res = await fetch(`${API_URL}/events`);
        const events = await res.json();
        grid.innerHTML = '';

        if (!events.length) return grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-10">Belum ada konser.</p>';

        events.forEach(event => {
            const date = new Date(event.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            let actionBtn = `<button onclick="buyTicket(${event.id})" class="w-full mt-4 block text-center bg-accent text-black font-bold py-3 rounded-lg transition duration-300 hover:bg-accent-hover">Beli Tiket</button>`;
            let badgeClass = "bg-black/70 text-white";
            let badgeText = event.default_category;

            if (event.status === 'sold_out') {
                actionBtn = `<button disabled class="w-full mt-4 block text-center bg-zinc-800 text-gray-500 font-bold py-3 rounded-lg cursor-not-allowed border border-white/10">SOLD OUT</button>`;
                badgeClass = "bg-red-600 text-white shadow-lg";
                badgeText = "SOLD OUT";
            }

            // Fallback Image
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
    } catch (e) { grid.innerHTML = `<p class="col-span-full text-center text-red-500">Gagal memuat data.</p>`; }
}

async function buyTicket(eventId) {
    const token = localStorage.getItem('clickon_token');
    if (!token) return window.location.href = 'login.html';
    if (!confirm("Beli tiket ini?")) return;

    try {
        const res = await fetch(`${API_URL}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ eventId: eventId })
        });
        const data = await res.json();
        if (res.ok) alert(`✅ Berhasil! Kode: ${data.ticket.ticketCode}`);
        else alert(`❌ Gagal: ${data.message}`);
    } catch (err) { alert("Error koneksi."); }
}

// ADMIN LOGIC
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
        if (res.ok) { alert("Terhapus!"); loadAdminEvents(); }
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

// CONVERT FILE TO BASE64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// ADD EVENT LOGIC
const addEventForm = document.getElementById('addEventForm');
if (addEventForm) {
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('clickon_token'); 
        
        // Disable tombol biar ga diklik 2x
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Menyimpan...";

        // Handle Image
        const fileInput = document.getElementById('eventImageFile');
        let imageBase64 = "";
        
        if (fileInput.files.length > 0) {
            try {
                // Batasi ukuran di client juga (misal 5MB peringatan)
                if(fileInput.files[0].size > 5 * 1024 * 1024) {
                    if(!confirm("Gambar cukup besar (>5MB), proses mungkin agak lama. Lanjut?")) {
                        btnSubmit.disabled = false; btnSubmit.textContent = "Simpan";
                        return;
                    }
                }
                imageBase64 = await toBase64(fileInput.files[0]);
            } catch (err) {
                alert("Gagal memproses gambar.");
                btnSubmit.disabled = false; btnSubmit.textContent = "Simpan";
                return;
            }
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

            // Cek Status Response
            if (res.ok) {
                alert('Berhasil!');
                closeModal('eventModal'); 
                loadAdminEvents();
                addEventForm.reset();
            } else {
                // Jika error 413 (Payload Too Large) biasanya response HTML/Text, bukan JSON
                if (res.status === 413) {
                    alert("Gagal: Gambar terlalu besar! (Maks 50MB)");
                } else {
                    const errJson = await res.json();
                    alert('Gagal: ' + (errJson.message || res.statusText));
                }
            }
        } catch (err) { 
            console.error(err);
            alert('Error koneksi atau Server Down.'); 
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Simpan";
        }
    });
}

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