// File: cetak.js

const webAppUrl = '/.netlify/functions/api'; // Alamat backend Netlify

document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'page-cetak') {
        initCetakPage();
    }
});

async function fetchAllData() {
    try {
        const response = await fetch(webAppUrl);
        if (!response.ok) throw new Error('Gagal mengambil data dari server.');
        return await response.json();
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
}

async function initCetakPage() {
    const container = document.querySelector('.cetak-container');
    try {
        const params = new URLSearchParams(window.location.search);
        const idKetetapan = params.get('id');
        if (!idKetetapan) throw new Error("ID Ketetapan tidak ditemukan di URL.");

        const data = await fetchAllData();
        const ketetapan = (data.ketetapan || []).find(k => k.ID_Ketetapan == idKetetapan);
        if (!ketetapan) throw new Error(`Ketetapan dengan ID ${idKetetapan} tidak ditemukan.`);
        
        const wajibPajak = (data.wajibPajak || []).find(wp => wp.NPWPD == ketetapan.NPWPD);
        if (!wajibPajak) throw new Error(`Data Wajib Pajak untuk NPWPD ${ketetapan.NPWPD} tidak ditemukan.`);

        const masterPajak = (data.masterPajak || []).find(mp => mp.KodeLayanan == ketetapan.KodeLayanan);

        document.getElementById('nomor-skpd').textContent = ketetapan.ID_Ketetapan;
        document.getElementById('nama-usaha').textContent = wajibPajak['Nama Usaha'];
        document.getElementById('alamat-wp').textContent = wajibPajak.Alamat;
        document.getElementById('npwpd').textContent = wajibPajak.NPWPD;
        
        // --- PERUBAHAN ADA DI BARIS INI ---
        document.getElementById('ayat').textContent = masterPajak ? masterPajak.NomorRekening : 'N/A';
        // ------------------------------------

        document.getElementById('jenis-pajak').textContent = masterPajak ? masterPajak.NamaLayanan : 'Layanan Tidak Ditemukan';
        
        const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
        
        document.getElementById('jumlah-pokok').textContent = formatRupiah(ketetapan.JumlahPokok);
        document.getElementById('denda').textContent = formatRupiah(ketetapan.Denda);
        document.getElementById('total-tagihan').textContent = formatRupiah(ketetapan.TotalTagihan);
        
        document.getElementById('terbilang').textContent = terbilang(ketetapan.TotalTagihan) + " Rupiah";
        document.getElementById('tanggal-surat').textContent = new Date(ketetapan.TanggalKetetapan).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    } catch (error) {
        container.innerHTML = `<p style="color: red; text-align: center;">Error: ${error.message}</p>`;
    }
}

function terbilang(angka) {
    angka = Math.abs(angka);
    const bilangan = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let temp = "";
    if (angka < 12) {
        temp = " " + bilangan[angka];
    } else if (angka < 20) {
        temp = terbilang(angka - 10) + " Belas";
    } else if (angka < 100) {
        temp = terbilang(Math.floor(angka / 10)) + " Puluh" + terbilang(angka % 10);
    } else if (angka < 200) {
        temp = " Seratus" + terbilang(angka - 100);
    } else if (angka < 1000) {
        temp = terbilang(Math.floor(angka / 100)) + " Ratus" + terbilang(angka % 100);
    } else if (angka < 2000) {
        temp = " Seribu" + terbilang(angka - 1000);
    } else if (angka < 1000000) {
        temp = terbilang(Math.floor(angka / 1000)) + " Ribu" + terbilang(angka % 1000);
    } else if (angka < 1000000000) {
        temp = terbilang(Math.floor(angka / 1000000)) + " Juta" + terbilang(angka % 1000000);
    }
    return temp.trim();
}