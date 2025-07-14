// --- KONFIGURASI ---
// Alamat backend di Netlify. Ini sudah final dan tidak perlu diubah.
const apiUrl = '/.netlify/functions/api';
// --------------------

// Variabel global untuk menyimpan data
let dataWajibPajakGlobal = [];
let dataWilayahGlobal = [];
let dataMasterPajakGlobal = [];
let dataKetetapanGlobal = [];

// Router utama yang berjalan setelah halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
    const pageId = document.body.id;
    switch (pageId) {
        case 'page-dashboard': initDashboardPage(); break;
        case 'page-tambah-wp': initTambahWpPage(); break;
        case 'page-lihat-wp': initLihatWpPage(); break;
        case 'page-tambah-ketetapan': initKetetapanPage(); break;
        case 'page-detail-wp': initDetailPage(); break;
    }
});


// =================================================================
// Inisialisasi Halaman
// =================================================================

async function initDashboardPage() {
    try {
        const data = await fetchAllData();
        document.getElementById('totalWp').textContent = data.wajibPajak.length;
    } catch (error) {
        document.getElementById('totalWp').textContent = 'Error';
        console.error("Error di Dasbor:", error);
    }
}

async function initTambahWpPage() {
    const form = document.getElementById('pajakForm');
    const kelurahanSelect = document.getElementById('kelurahan');
    const kecamatanInput = document.getElementById('kecamatan');
    const generateCheckbox = document.getElementById('generateNpwpd');
    const npwpdInput = document.getElementById('npwpd');
    const jenisWpGroup = document.getElementById('jenisWpGroup');

    try {
        const data = await fetchAllData();
        dataWilayahGlobal = data.wilayah || [];
        kelurahanSelect.innerHTML = '<option value="">-- Pilih Kelurahan --</option>';
        dataWilayahGlobal.forEach(item => {
            const option = document.createElement('option');
            option.value = item.Kelurahan;
            option.textContent = item.Kelurahan;
            option.dataset.kodekel = item.KodeKelurahan;
            option.dataset.kodekec = item.KodeKecamatan;
            kelurahanSelect.appendChild(option);
        });
    } catch (error) {
        kelurahanSelect.innerHTML = '<option value="">Gagal memuat data</option>';
    }

    generateCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            npwpdInput.readOnly = true;
            npwpdInput.style.backgroundColor = '#e9ecef';
            npwpdInput.value = '(Akan dibuat otomatis)';
            npwpdInput.required = false;
            jenisWpGroup.style.display = 'block';
        } else {
            npwpdInput.readOnly = false;
            npwpdInput.style.backgroundColor = 'white';
            npwpdInput.value = '';
            npwpdInput.required = true;
            npwpdInput.placeholder = 'Ketik NPWPD manual...';
            jenisWpGroup.style.display = 'none';
        }
    });

    kelurahanSelect.addEventListener('change', (e) => {
        const wilayahCocok = dataWilayahGlobal.find(w => w.Kelurahan === e.target.value);
        kecamatanInput.value = wilayahCocok ? wilayahCocok.Kecamatan : '';
    });
    
    form.addEventListener('submit', handleWpFormSubmit);
}

async function initLihatWpPage() {
    try {
        const data = await fetchAllData();
        dataWajibPajakGlobal = data.wajibPajak || [];
        dataWilayahGlobal = data.wilayah || [];
        populateWpDataTable(dataWajibPajakGlobal);
        setupWpEditModal();
        
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredData = dataWajibPajakGlobal.filter(item => 
                String(item.NPWPD).toLowerCase().includes(searchTerm) ||
                String(item['Nama Usaha']).toLowerCase().includes(searchTerm)
            );
            populateWpDataTable(filteredData);
        });
    } catch (error) {
        document.querySelector("#dataTable tbody").innerHTML = `<tr><td colspan="12">Gagal memuat data: ${error.message}</td></tr>`;
    }
}

async function initKetetapanPage() {
    const form = document.getElementById('ketetapanForm');
    const layananSelect = document.getElementById('ketetapanLayanan');
    const npwpdInput = document.getElementById('ketetapanNpwpd');

    const params = new URLSearchParams(window.location.search);
    const npwpdFromUrl = params.get('npwpd');
    if (npwpdFromUrl) {
        npwpdInput.value = npwpdFromUrl;
        npwpdInput.readOnly = true;
        npwpdInput.style.backgroundColor = '#e9ecef';
    }
    
    try {
        const data = await fetchAllData();
        const masterPajakData = data.masterPajak || [];
        layananSelect.innerHTML = '<option value="">-- Pilih Layanan --</option>';
        masterPajakData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.KodeLayanan;
            option.textContent = `${item.NamaLayanan} (${item.Tipe})`;
            layananSelect.appendChild(option);
        });
    } catch (error) {
        layananSelect.innerHTML = '<option value="">Gagal memuat data</option>';
    }
    form.addEventListener('submit', handleKetetapanFormSubmit);
}

async function initDetailPage() {
    const detailContent = document.getElementById('detailContent');
    const fotoContent = document.getElementById('fotoContent');
    const aksiContent = document.getElementById('detailAksi');

    try {
        const params = new URLSearchParams(window.location.search);
        const npwpd = params.get('npwpd');
        if (!npwpd) throw new Error("NPWPD tidak ditemukan di URL.");

        const data = await fetchAllData();
        dataWajibPajakGlobal = data.wajibPajak || [];
        dataKetetapanGlobal = data.ketetapan || [];
        dataWilayahGlobal = data.wilayah || [];
        const item = dataWajibPajakGlobal.find(wp => wp.NPWPD == npwpd);
        if (!item) throw new Error(`Data untuk NPWPD ${npwpd} tidak ditemukan.`);

        aksiContent.innerHTML = `<a href="tambah-ketetapan.html?npwpd=${npwpd}">Buat Ketetapan Baru</a>`;
        displayDetailData(item);
        displayPhotos(item);
        const riwayatKetetapan = dataKetetapanGlobal.filter(k => k.NPWPD == npwpd);
        displayKetetapanHistory(riwayatKetetapan);
        setupKetetapanEditModal();
    } catch (error) {
        detailContent.innerHTML = `<p style="color: red;">${error.message}</p>`;
    }
}


// =================================================================
// Fungsi-fungsi Aksi (CRUD Handlers)
// =================================================================

async function handleWpFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Mengirim...'; statusDiv.style.display = 'none';
    
    const generateMode = document.getElementById('generateNpwpd').checked;
    const kelurahanSelect = document.getElementById('kelurahan');
    const selectedKelurahanOption = kelurahanSelect.options[kelurahanSelect.selectedIndex];

    try {
        const [fotoPemilik, fotoTempatUsaha, fotoKtp] = await Promise.all([
            fileToBase64(document.getElementById('fotoPemilik').files[0]),
            fileToBase64(document.getElementById('fotoTempatUsaha').files[0]),
            fileToBase64(document.getElementById('fotoKtp').files[0])
        ]);

        let dataToSend = {
            action: 'createWp',
            generate_mode: generateMode,
            namaUsaha: document.getElementById('namaUsaha').value,
            namaPemilik: document.getElementById('namaPemilik').value,
            nikKtp: document.getElementById('nikKtp').value,
            alamat: document.getElementById('alamat').value,
            telephone: document.getElementById('telephone').value,
            kelurahan: kelurahanSelect.value,
            kecamatan: document.getElementById('kecamatan').value,
            fotoPemilik, fotoTempatUsaha, fotoKtp
        };

        if (generateMode) {
            dataToSend.jenisWp = document.getElementById('jenisWp').value;
            dataToSend.kodeKelurahan = selectedKelurahanOption.dataset.kodekel;
            dataToSend.kodeKecamatan = selectedKelurahanOption.dataset.kodekec;
        } else {
            dataToSend.npwpd = document.getElementById('npwpd').value;
            dataToSend.jenisWp = "Lama";
        }
        
        const result = await postData(dataToSend);
        showStatus(result.message || 'Data WP berhasil dibuat!', true);
        event.target.reset(); 
        document.getElementById('kecamatan').value = '';
        document.getElementById('generateNpwpd').checked = false;
        document.getElementById('npwpd').readOnly = false;
        document.getElementById('npwpd').style.backgroundColor = 'white';
        document.getElementById('npwpd').value = '';
        document.getElementById('jenisWpGroup').style.display = 'none';

    } catch (error) {
        showStatus('Gagal mengirim data: ' + error.message, false);
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Kirim Data';
    }
}

async function handleDeleteWpClick(npwpd) {
    if (!confirm(`Anda yakin ingin menghapus data WP dengan NPWPD: ${npwpd}?`)) return;
    try {
        const result = await postData({ action: 'deleteWp', npwpd: npwpd });
        alert(result.message || 'Data berhasil dihapus.');
        initLihatWpPage();
    } catch (error) {
        alert('Gagal menghapus data: ' + error.message);
    }
}

function handleEditWpClick(npwpd) {
    const dataToEdit = dataWajibPajakGlobal.find(item => item.NPWPD == npwpd);
    if (!dataToEdit) { alert('Data tidak ditemukan!'); return; }
    document.getElementById('editNpwd').value = dataToEdit.NPWPD;
    document.getElementById('editNamaUsaha').value = dataToEdit['Nama Usaha'];
    document.getElementById('editNamaPemilik').value = dataToEdit['Nama Pemilik'];
    document.getElementById('editNikKtp').value = dataToEdit['NIK KTP'];
    document.getElementById('editAlamat').value = dataToEdit.Alamat;
    document.getElementById('editTelephone').value = dataToEdit.Telephone;
    const kelurahanEditSelect = document.getElementById('editKelurahan');
    kelurahanEditSelect.innerHTML = '';
    dataWilayahGlobal.forEach(item => {
        const option = document.createElement('option');
        option.value = item.Kelurahan; option.textContent = item.Kelurahan;
        kelurahanEditSelect.appendChild(option);
    });
    kelurahanEditSelect.value = dataToEdit.Kelurahan;
    document.getElementById('editKecamatan').value = dataToEdit.Kecamatan;
    document.getElementById('editModal').style.display = 'block';
}

async function handleUpdateWpFormSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    const updatedData = {
        action: 'updateWp', npwpd: document.getElementById('editNpwd').value,
        namaUsaha: document.getElementById('editNamaUsaha').value, namaPemilik: document.getElementById('editNamaPemilik').value,
        nikKtp: document.getElementById('editNikKtp').value, alamat: document.getElementById('editAlamat').value,
        telephone: document.getElementById('editTelephone').value, kelurahan: document.getElementById('editKelurahan').value,
        kecamatan: document.getElementById('editKecamatan').value
    };
    try {
        const result = await postData(updatedData);
        alert(result.message || 'Data berhasil diperbarui!');
        document.getElementById('editModal').style.display = 'none';
        initLihatWpPage();
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}

async function handleKetetapanFormSubmit(event) {
    event.preventDefault();
    const submitButton = document.getElementById('submitKetetapanButton');
    const statusDiv = document.getElementById('status');
    submitButton.disabled = true; submitButton.textContent = 'Membuat Ketetapan...'; statusDiv.style.display = 'none';
    try {
        const dataToSend = {
            action: 'createKetetapan', npwpd: document.getElementById('ketetapanNpwpd').value,
            kodeLayanan: document.getElementById('ketetapanLayanan').value, masaPajak: document.getElementById('ketetapanMasaPajak').value,
            jumlahPokok: document.getElementById('ketetapanJumlahPokok').value, tglTunggakan: document.getElementById('tglTunggakan').value,
            catatan: document.getElementById('catatan').value
        };
        const result = await postData(dataToSend);
        showStatus(result.message || 'Ketetapan berhasil dibuat!', true, 'status');
        event.target.reset();
        const npwpdFromUrl = new URLSearchParams(window.location.search).get('npwpd');
        if (npwpdFromUrl) document.getElementById('ketetapanNpwpd').value = npwpdFromUrl;
    } catch (error) {
        showStatus('Gagal membuat ketetapan: ' + error.message, false, 'status');
    } finally {
        submitButton.disabled = false; submitButton.textContent = 'Buat Ketetapan';
    }
}

async function handleDeleteKetetapanClick(idKetetapan) {
    if (!confirm(`Anda yakin ingin menghapus ketetapan dengan ID: ${idKetetapan}?`)) return;
    try {
        const result = await postData({ action: 'deleteKetetapan', id_ketetapan: idKetetapan });
        alert(result.message || 'Ketetapan berhasil dihapus.');
        location.reload();
    } catch (error) {
        alert('Gagal menghapus ketetapan: ' + error.message);
    }
}

function handleEditKetetapanClick(idKetetapan) {
    const dataToEdit = dataKetetapanGlobal.find(item => item.ID_Ketetapan == idKetetapan);
    if (!dataToEdit) { alert('Data ketetapan tidak ditemukan!'); return; }
    document.getElementById('editKetetapanId').value = dataToEdit.ID_Ketetapan;
    document.getElementById('editKetetapanMasaPajak').value = dataToEdit.MasaPajak;
    document.getElementById('editKetetapanJumlahPokok').value = dataToEdit.JumlahPokok;
    document.getElementById('editKetetapanCatatan').value = dataToEdit.Catatan;
    document.getElementById('editKetetapanModal').style.display = 'block';
}

async function handleUpdateKetetapanSubmit(event) {
    event.preventDefault();
    const updateButton = document.getElementById('updateKetetapanButton');
    updateButton.disabled = true; updateButton.textContent = 'Menyimpan...';
    try {
        const updatedData = {
            action: 'updateKetetapan', id_ketetapan: document.getElementById('editKetetapanId').value,
            masaPajak: document.getElementById('editKetetapanMasaPajak').value,
            jumlahPokok: document.getElementById('editKetetapanJumlahPokok').value,
            catatan: document.getElementById('editKetetapanCatatan').value
        };
        const result = await postData(updatedData);
        alert(result.message || 'Ketetapan berhasil diperbarui!');
        document.getElementById('editKetetapanModal').style.display = 'none';
        location.reload();
    } catch (error) {
        alert('Gagal memperbarui data: ' + error.message);
    } finally {
        updateButton.disabled = false; updateButton.textContent = 'Simpan Perubahan';
    }
}


// =================================================================
// Fungsi-fungsi Pembantu (Helpers)
// =================================================================

function showStatus(message, isSuccess, elementId = 'status') {
    const statusDiv = document.getElementById(elementId);
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = isSuccess ? 'status-sukses' : 'status-gagal';
    statusDiv.style.display = 'block';
}

async function postData(data) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.status === 'gagal' || !response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error('Post error:', error);
        throw error;
    }
}

function setupWpEditModal() {
    const modal = document.getElementById('editModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-button');
    const editForm = document.getElementById('editForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    editForm.addEventListener('submit', handleUpdateWpFormSubmit);
}

function setupKetetapanEditModal() {
    const modal = document.getElementById('editKetetapanModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('#closeKetetapanModal');
    const editForm = document.getElementById('editKetetapanForm');
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    window.addEventListener('click', (event) => { if (event.target == modal) modal.style.display = 'none'; });
    editForm.addEventListener('submit', handleUpdateKetetapanSubmit);
}

async function fetchAllData() {
    const response = await fetch(apiUrl);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gagal mengambil data dari server. Status: ${response.status}. Pesan: ${errorText}`);
    }
    const result = await response.json();
    if (result.status === 'gagal') throw new Error(result.message);
    return result;
}

function populateWpDataTable(wajibPajakData) {
    const tableHead = document.querySelector("#dataTable thead");
    const tableBody = document.querySelector("#dataTable tbody");
    if (!tableHead || !tableBody) return;
    tableHead.innerHTML = ''; tableBody.innerHTML = '';
    if (wajibPajakData.length > 0) {
        // Mapping header: key Google Sheet -> label user-friendly
        const headerMap = {
            'NPWPD': 'NPWPD',
            'JenisWP': 'Jenis WP',
            'Nama Usaha': 'Nama Usaha',
            'Nama Pemilik': 'Nama Pemilik',
            'NIK KTP': 'NIK',
            'Alamat': 'Alamat Usaha',
            'Telephone': 'No. Telepon',
            'Kelurahan': 'Kelurahan',
            'Kecamatan': 'Kecamatan',
            'Foto Pemilik': 'Foto Pemilik',
            'Foto Tempat Usaha': 'Foto Tempat Usaha',
            'Foto KTP': 'Foto KTP'
        };
        const headers = Object.keys(wajibPajakData[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => { headerRow.innerHTML += `<th>${headerMap[h] || h}</th>`; });
        headerRow.innerHTML += `<th>Aksi</th>`;
        tableHead.appendChild(headerRow);
        wajibPajakData.forEach(rowData => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                let cellData = rowData[header];
                if (header === 'NPWPD') {
                    cell.innerHTML = `<a href="detail.html?npwpd=${cellData}">${cellData}</a>`;
                } else if (typeof cellData === 'string' && cellData.startsWith('http')) {
                    cell.innerHTML = `<a href="${cellData}" target="_blank">Lihat Foto</a>`;
                } else {
                    cell.textContent = cellData || '';
                }
                row.appendChild(cell);
            });
            const npwpd = rowData['NPWPD'];
            const aksiCell = document.createElement('td');
            aksiCell.innerHTML = `<button class="btn-aksi btn-edit" onclick="handleEditWpClick('${npwpd}')">Edit</button> <button class="btn-aksi btn-hapus" onclick="handleDeleteWpClick('${npwpd}')">Hapus</button>`;
            row.appendChild(aksiCell);
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="12">Tidak ada data ditemukan.</td></tr>`;
    }
}

function displayDetailData(item) {
    const detailContent = document.getElementById('detailContent');
    detailContent.innerHTML = `<dl class="detail-grid"><dt>NPWPD</dt><dd>${item.NPWPD||'-'}</dd><dt>Nama Usaha</dt><dd>${item['Nama Usaha']||'-'}</dd><dt>Nama Pemilik</dt><dd>${item['Nama Pemilik']||'-'}</dd><dt>NIK KTP</dt><dd>${item['NIK KTP']||'-'}</dd><dt>Alamat</dt><dd>${item.Alamat||'-'}</dd><dt>Telephone</dt><dd>${item.Telephone||'-'}</dd><dt>Kelurahan</dt><dd>${item.Kelurahan||'-'}</dd><dt>Kecamatan</dt><dd>${item.Kecamatan||'-'}</dd></dl>`;
}

function displayPhotos(item) {
    const fotoContent = document.getElementById('fotoContent');
    fotoContent.innerHTML = '';
    const fotoData = [{ label: 'Foto Pemilik', url: item['Foto Pemilik'] }, { label: 'Foto Tempat Usaha', url: item['Foto Tempat Usaha'] }, { label: 'Foto KTP', url: item['Foto KTP'] }];
    fotoData.forEach(foto => { if (foto.url) fotoContent.innerHTML += `<div class="foto-card"><img src="${foto.url}" alt="${foto.label}"><p>${foto.label}</p></div>`; });
}

function displayKetetapanHistory(riwayatData) {
    const tableHead = document.querySelector("#ketetapanTable thead");
    const tableBody = document.querySelector("#ketetapanTable tbody");
    if (!tableHead || !tableBody) return;
    tableHead.innerHTML = ''; tableBody.innerHTML = '';
    if (riwayatData.length > 0) {
        const headers = Object.keys(riwayatData[0]);
        const headerRow = document.createElement('tr');
        headers.forEach(h => { headerRow.innerHTML += `<th>${h}</th>`; });
        headerRow.innerHTML += `<th>Aksi</th>`;
        tableHead.appendChild(headerRow);
        riwayatData.forEach(rowData => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const cell = document.createElement('td');
                let cellData = rowData[header];
                if (header === 'TanggalKetetapan' && cellData) {
                    cellData = new Date(cellData).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                if (['JumlahPokok', 'Denda', 'TotalTagihan'].includes(header)) {
                    cellData = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(cellData);
                }
                cell.textContent = cellData || '';
                row.appendChild(cell);
            });
            const idKetetapan = rowData['ID_Ketetapan'];
            const aksiCell = document.createElement('td');
            aksiCell.innerHTML = `
                <a href="cetak-skpd.html?id=${idKetetapan}" target="_blank" class="btn-aksi" style="background-color: #0d6efd; text-decoration: none; display: inline-block; margin-right: 5px;">Cetak</a>
                <button class="btn-aksi btn-edit" onclick="handleEditKetetapanClick('${idKetetapan}')">Edit</button>
                <button class="btn-aksi btn-hapus" onclick="handleDeleteKetetapanClick('${idKetetapan}')">Hapus</button>
            `;
            row.appendChild(aksiCell);
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `<tr><td colspan="11">Belum ada riwayat ketetapan.</td></tr>`;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) { resolve(""); return; }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}