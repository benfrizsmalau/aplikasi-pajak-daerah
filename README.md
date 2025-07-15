# Aplikasi Sistem Informasi Pendapatan Daerah

Aplikasi modern untuk mengelola data wajib pajak, ketetapan, dan pembayaran pajak daerah.

## Standar Tabel untuk Seluruh Aplikasi

### Struktur HTML Standar

```html
<!-- Container Search dan Filter -->
<div class="standard-search-filter">
    <div class="search-box">
        <input type="text" id="searchInput" placeholder="Cari data...">
        <button type="button" id="searchButton" class="btn-primary">
            <span class="btn-icon">🔍</span>
            Cari
        </button>
    </div>
    <div class="filter-options">
        <select id="filterStatus" class="filter-select">
            <option value="">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Nonaktif">Nonaktif</option>
        </select>
        <button type="button" id="resetFilter" class="btn-secondary">
            <span class="btn-icon">🔄</span>
            Reset Filter
        </button>
    </div>
</div>

<!-- Container Tabel -->
<div class="standard-table-container">
    <div class="table-header">
        <h3>📊 Judul Tabel</h3>
        <div class="table-info">
            <span id="totalRecords">Total: 0 data</span>
        </div>
    </div>
    
    <div class="table-content">
        <table id="dataTable" class="standard-table">
            <thead>
                <tr>
                    <th>No</th>
                    <th>Kolom 1</th>
                    <th>Kolom 2</th>
                    <th>Aksi</th>
                </tr>
            </thead>
            <tbody>
                <tr><td colspan="4" class="table-loading">Memuat data...</td></tr>
            </tbody>
        </table>
    </div>
</div>
```

### JavaScript Function Standar

```javascript
// Konfigurasi tabel
const tableConfig = {
    columns: [
        { key: 'index', label: 'No', type: 'text' },
        { key: 'nama', label: 'Nama', type: 'text' },
        { key: 'jumlah', label: 'Jumlah', type: 'rupiah' },
        { key: 'tanggal', label: 'Tanggal', type: 'date' },
        { key: 'status', label: 'Status', type: 'status', statusColors: { 'Aktif': 'green', 'Nonaktif': 'red' } }
    ],
    actions: [
        { type: 'edit', key: 'id', onClick: 'handleEdit', icon: '✏️' },
        { type: 'delete', key: 'id', onClick: 'handleDelete', icon: '🗑️' }
    ],
    emptyMessage: 'Tidak ada data ditemukan.'
};

// Proses data
const processedData = data.map((item, index) => ({
    ...item,
    index: index + 1
}));

// Gunakan fungsi standar
createStandardTable('dataTable', processedData, tableConfig);
```

### Tipe Kolom yang Didukung

1. **text** - Teks biasa
2. **rupiah** - Format mata uang Indonesia
3. **date** - Format tanggal Indonesia
4. **link** - Link dengan href dinamis
5. **status** - Status dengan warna
6. **photo** - Link foto

### Tipe Action yang Didukung

1. **edit** - Tombol edit
2. **delete** - Tombol hapus
3. **print** - Tombol cetak
4. **custom** - Tombol kustom

### CSS Classes Standar

- `.standard-table-container` - Container utama tabel
- `.standard-table` - Tabel standar
- `.standard-search-filter` - Container search dan filter
- `.btn-aksi` - Tombol aksi standar
- `.table-loading` - State loading
- `.table-empty` - State kosong

### Contoh Implementasi Lengkap

```javascript
function displayData(data) {
    const tableConfig = {
        columns: [
            { key: 'index', label: 'No', type: 'text' },
            { key: 'NPWPD', label: 'NPWPD', type: 'link', linkUrl: 'detail.html?npwpd=', linkKey: 'NPWPD' },
            { key: 'namaUsaha', label: 'Nama Usaha', type: 'text' },
            { key: 'jumlah', label: 'Jumlah', type: 'rupiah' },
            { key: 'status', label: 'Status', type: 'status', statusColors: { 'Aktif': 'green', 'Nonaktif': 'red' } }
        ],
        actions: [
            { type: 'edit', key: 'id', onClick: 'handleEdit', icon: '✏️' },
            { type: 'delete', key: 'id', onClick: 'handleDelete', icon: '🗑️' }
        ],
        emptyMessage: 'Tidak ada data ditemukan.'
    };
    
    const processedData = data.map((item, index) => ({
        ...item,
        index: index + 1
    }));
    
    createStandardTable('dataTable', processedData, tableConfig);
}
```

## Fitur Utama

- Dashboard dengan statistik dan grafik
- Manajemen data wajib pajak
- Pembuatan dan pengelolaan ketetapan
- Sistem pembayaran pajak
- Cetak dokumen (SKPD/SKRD, SSPD/SSRD, Fiskal)
- Pencarian dan filter data
- Responsive design

## Teknologi

- HTML5, CSS3, JavaScript
- Chart.js untuk grafik
- Netlify Functions untuk API
- Google Sheets sebagai database

## Struktur File

```
├── index.html              # Dashboard
├── tambah-data.html        # Tambah data WP
├── lihat-data.html         # Lihat data WP
├── detail.html             # Detail WP
├── tambah-ketetapan.html   # Buat ketetapan
├── daftar-ketetapan.html   # Daftar ketetapan
├── setoran-pajak.html      # Setoran pajak
├── daftar-pembayaran.html  # Daftar pembayaran
├── daftar-fiskal.html      # Daftar fiskal
├── cetak-skpd.html         # Cetak SKPD/SKRD
├── cetak.js                # Script cetak
├── script.js               # Script utama
├── style.css               # Stylesheet
├── netlify/functions/api.js # API backend
└── images/                 # Assets gambar
```

## Cara Penggunaan

1. Clone repository ini
2. Deploy ke Netlify
3. Setup Google Sheets sebagai database
4. Konfigurasi environment variables
5. Akses aplikasi melalui URL yang diberikan

## Kontribusi

Dibuat oleh REYNOLDS untuk Badan Pendapatan Pengelolaan Keuangan dan Aset Daerah Kabupaten Mamberamo Raya.