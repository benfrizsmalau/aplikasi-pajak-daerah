// Alamat backend baru Anda di Netlify. JANGAN DIUBAH.
const webAppUrl = '/.netlify/functions/api';

// Router utama yang berjalan setelah halaman HTML dimuat
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    switch (pageId) {
        case 'page-dashboard':
            initDashboardPage();
            break;
        case 'page-tambah-wp':
            // Logika untuk halaman tambah WP akan ditambahkan di sini
            break;
        case 'page-lihat-wp':
            initLihatWpPage();
            break;
        // Tambahkan case lain jika ada halaman lain
    }
});


// =================================================================
// Inisialisasi Halaman
// =================================================================

// Fungsi untuk mengambil semua data dari backend
async function fetchAllData() {
    try {
        const response = await fetch(webAppUrl);
        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.message || 'Gagal mengambil data dari server.');
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

// Inisialisasi untuk halaman Dasbor
async function initDashboardPage() {
    const totalWpElement = document.getElementById('totalWp');
    try {
        const data = await fetchAllData();
        totalWpElement.textContent = data.wajibPajak.length;
    } catch (error) {
        totalWpElement.textContent = 'Error';
        console.error("Error di Dasbor:", error);
    }
}

// Inisialisasi untuk halaman Lihat Data
async function initLihatWpPage() {
    try {
        const data = await fetchAllData();
        const wajibPajakData = data.wajibPajak || [];
        populateDataTable(wajibPajakData);
    } catch (error) {
        document.querySelector("#dataTable tbody").innerHTML = `<tr><td colspan="12">Gagal memuat data: ${error.message}</td></tr>`;
    }
}


// =================================================================
// Fungsi-fungsi Pembantu
// =================================================================

// Fungsi untuk mengisi tabel data wajib pajak
function populateDataTable(wajibPajakData) {
    const tableHead = document.querySelector("#dataTable thead");
    const tableBody = document.querySelector("#dataTable tbody");
    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (wajibPajakData.length > 0) {
        const headers = Object.keys(wajibPajakData[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        tableHead.appendChild(headerRow);

        wajibPajakData.forEach(rowData => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                cell.textContent = rowData[header] || '';
                row.appendChild(cell);
            });
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="11">Tidak ada data ditemukan.</td></tr>`;
    }
}