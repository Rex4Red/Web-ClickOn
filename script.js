// Fungsi ini hanya simulasi. 
// Dalam aplikasi nyata, ini akan mengarah ke halaman detail konser atau checkout.
function showTicketDetail() {
    alert("Fungsi 'Beli Tiket' memerlukan Backend dan Database.\nIni adalah bagian dari 'Proses Penjualan Tiket'  yang perlu dikembangkan.");
}

// Menambahkan event listener ke tombol Login
// Dalam aplikasi nyata, ini akan memunculkan modal login atau pindah halaman
document.querySelector('a[href="#login"]').addEventListener('click', function(e) {
    e.preventDefault();
    alert("Halaman Login/Daftar.\nIni akan terhubung ke 'Manajemen Pengguna dan Akses' [cite: 44] di backend.");
});