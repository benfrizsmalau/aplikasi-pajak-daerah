const { google } = require('googleapis');

// --- KONFIGURASI ---
const SPREADSHEET_ID = '1HGO9-MsOyezFU3B8opAc8GeCsLshKNSSWyb3cEBxCoY';
const FOLDER_ID = "1x3EmFN0kM7x9Th0ZxsHEWX7hFNU6Vum8";

const WP_SHEET_NAME = "datawp";
const WILAYAH_SHEET_NAME = "Wilayah";
const KETETAPAN_SHEET_NAME = "KetetapanPajak";
const MASTER_PAJAK_SHEET_NAME = "MasterPajakRetribusi";
const PEMBAYARAN_SHEET_NAME = "RiwayatPembayaran";
// --------------------

// Fungsi otentikasi
async function getAuthClient() {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    return new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'] }).getClient();
}

// Handler utama Netlify Function
exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };

    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        
        if (event.httpMethod === 'GET') {
            const responseData = await handleGet(sheets);
            return { statusCode: 200, headers, body: JSON.stringify(responseData) };
        }
        
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            let resultMessage = {};
            switch (body.action) {
                case 'createWp': resultMessage = await handleCreateWp(auth, sheets, body); break;
                case 'updateWp': resultMessage = await handleUpdateWp(sheets, body); break;
                case 'deleteWp': resultMessage = await handleDeleteWp(sheets, body); break;
                case 'createKetetapan': resultMessage = await handleCreateKetetapan(sheets, body); break;
                case 'deleteKetetapan': resultMessage = await handleDeleteKetetapan(sheets, body); break;
                case 'updateKetetapan': resultMessage = await handleUpdateKetetapan(sheets, body); break;
                case 'createPembayaran': resultMessage = await handleCreatePembayaran(sheets, body); break;
                case 'deletePembayaran': resultMessage = await handleDeletePembayaran(sheets, body); break;
                case 'deleteFiskal': resultMessage = await handleDeleteFiskal(sheets, body); break;
                default: throw new Error(`Aksi '${body.action}' tidak dikenali`);
            }
            return { statusCode: 200, headers, body: JSON.stringify({ status: 'sukses', ...resultMessage }) };
        }

    } catch (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ status: 'gagal', message: error.message }) };
    }
};

// =================================================================
// FUNGSI-FUNGSI HANDLER
// =================================================================

async function handleGet(sheets) {
    const ranges = [WP_SHEET_NAME, WILAYAH_SHEET_NAME, MASTER_PAJAK_SHEET_NAME, KETETAPAN_SHEET_NAME, PEMBAYARAN_SHEET_NAME];
    const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SPREADSHEET_ID, ranges });
    return {
        wajibPajak: formatSheetData(response.data.valueRanges[0].values),
        wilayah: formatSheetData(response.data.valueRanges[1].values),
        masterPajak: formatSheetData(response.data.valueRanges[2].values),
        ketetapan: formatSheetData(response.data.valueRanges[3].values),
        pembayaran: formatSheetData(response.data.valueRanges[4].values),
    };
}

async function handleCreateWp(auth, sheets, data) {
    const wpSheetData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${WP_SHEET_NAME}!A:A` });
    const allNpwpd = (wpSheetData.data.values || []).flat();
    let newNpwpd;
    let jenisWp = data.jenisWp;

    if (data.generate_mode === true) {
        const nextSequence = (allNpwpd.length).toString().padStart(6, '0');
        newNpwpd = `P.${data.jenisWp}.${nextSequence}.${data.kodeKecamatan}.${data.kodeKelurahan}`;
    } else {
        newNpwpd = data.npwpd;
        if (allNpwpd.includes(newNpwpd)) throw new Error(`NPWPD ${newNpwpd} sudah terdaftar.`);
    }

    const drive = google.drive({ version: 'v3', auth });
    const [urlFotoPemilik, urlFotoUsaha, urlFotoKtp] = await Promise.all([
        uploadFile(drive, data.fotoPemilik, `pemilik_${newNpwpd}`),
        uploadFile(drive, data.fotoTempatUsaha, `usaha_${newNpwpd}`),
        uploadFile(drive, data.fotoKtp, `ktp_${newNpwpd}`)
    ]);
    
    const newRow = [[
        newNpwpd, jenisWp, data.namaUsaha, data.namaPemilik, data.nikKtp, data.alamat, 
        data.telephone, data.kelurahan, data.kecamatan, 
        urlFotoPemilik, urlFotoUsaha, urlFotoKtp
    ]];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID, range: WP_SHEET_NAME,
        valueInputOption: 'USER_ENTERED', resource: { values: newRow },
    });
    return { message: `Data WP dengan NPWPD ${newNpwpd} berhasil dibuat.` };
}

async function handleUpdateWp(sheets, data) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: WP_SHEET_NAME });
    const allData = response.data.values; let rowIndex = -1; let oldDataRow;
    for (let i = 1; i < allData.length; i++) { if (allData[i][0] == data.npwpd) { rowIndex = i + 1; oldDataRow = allData[i]; break; } }
    if (rowIndex === -1) throw new Error("NPWPD untuk update tidak ditemukan.");
    const updatedRow = [
        data.npwpd, oldDataRow[1], data.namaUsaha, data.namaPemilik, data.nikKtp, data.alamat,
        data.telephone, data.kelurahan, data.kecamatan
    ];
    await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${WP_SHEET_NAME}!A${rowIndex}:I${rowIndex}`, valueInputOption: 'USER_ENTERED', resource: { values: [updatedRow] }, });
    return { message: "Data WP berhasil diperbarui" };
}

async function handleDeleteWp(sheets, data) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: WP_SHEET_NAME });
    const allData = response.data.values; let rowIndex = -1; let sheetId = -1;
    for (let i = 1; i < allData.length; i++) { if (allData[i][0] == data.npwpd) { rowIndex = i; break; } }
    if (rowIndex === -1) throw new Error("NPWPD untuk dihapus tidak ditemukan.");
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [WP_SHEET_NAME], fields: 'sheets(properties(sheetId,title))' });
    const sheetInfo = sheetMetadata.data.sheets.find(s => s.properties.title === WP_SHEET_NAME);
    if (!sheetInfo) throw new Error("Gagal menemukan metadata sheet.");
    sheetId = sheetInfo.properties.sheetId;
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, resource: { requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }] } });
    return { message: "Data WP berhasil dihapus" };
}

async function handleCreateKetetapan(sheets, data) {
    const [ketetapanData, masterData] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: KETETAPAN_SHEET_NAME }),
        sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: MASTER_PAJAK_SHEET_NAME }),
    ]);
    const allKetetapan = ketetapanData.data.values || [];
    const allMaster = masterData.data.values || [];
    const lastRow = allKetetapan.length;
    const nextIdNumber = (lastRow + 1).toString().padStart(7, '0');
    const layananInfo = allMaster.find(row => row[0] === data.kodeLayanan);
    if (!layananInfo) throw new Error("Kode Layanan tidak valid.");
    const tipeLayanan = layananInfo[2] === 'Pajak' ? 'SKPD' : 'SKRD';
    const today = new Date();
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const newKetetapanId = `${nextIdNumber}/${tipeLayanan}/${romanMonths[today.getMonth()]}/${today.getFullYear()}`;
    let denda = 0; const jumlahPokok = parseFloat(data.jumlahPokok); let tanggalAwal;
    if (data.tglTunggakan) {
        tanggalAwal = new Date(data.tglTunggakan);
    } else {
        let tanggalTerakhir = null;
        for (let i = allKetetapan.length - 1; i > 0; i--) {
            if (allKetetapan[i][2] == data.npwpd && allKetetapan[i][1] == data.kodeLayanan) {
                tanggalTerakhir = new Date(allKetetapan[i][4]); break;
            }
        }
        tanggalAwal = tanggalTerakhir;
    }
    if (tanggalAwal) {
        const selisihBulan = (today.getFullYear() - tanggalAwal.getFullYear()) * 12 + (today.getMonth() - tanggalAwal.getMonth());
        if (selisihBulan > 0) denda = selisihBulan * 0.02 * jumlahPokok;
    }
    const totalTagihan = jumlahPokok + denda;
    const newRow = [[ newKetetapanId, data.kodeLayanan, data.npwpd, data.masaPajak, today.toISOString(), jumlahPokok, denda, totalTagihan, "Belum Lunas", data.catatan || "" ]];
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: KETETAPAN_SHEET_NAME, valueInputOption: 'USER_ENTERED', resource: { values: newRow }, });
    return { message: "Ketetapan berhasil dibuat." };
}

async function handleDeleteKetetapan(sheets, data) {
    const idKetetapanToDelete = data.id_ketetapan;
    const pembayaranSheetData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: PEMBAYARAN_SHEET_NAME });
    if(pembayaranSheetData.data.values){
      if (pembayaranSheetData.data.values.some(row => row[1] == idKetetapanToDelete)) {
        throw new Error("Ketetapan tidak bisa dihapus karena sudah memiliki riwayat pembayaran.");
      }
    }
    const ketetapanData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: KETETAPAN_SHEET_NAME });
    const allData = ketetapanData.data.values; let rowIndex = -1; let sheetId = -1;
    for (let i = 1; i < allData.length; i++) { if (allData[i][0] == idKetetapanToDelete) { rowIndex = i; break; } }
    if (rowIndex === -1) throw new Error("ID Ketetapan untuk dihapus tidak ditemukan.");
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [KETETAPAN_SHEET_NAME], fields: 'sheets(properties(sheetId,title))' });
    const sheetInfo = sheetMetadata.data.sheets.find(s => s.properties.title === KETETAPAN_SHEET_NAME);
    if (!sheetInfo) throw new Error("Gagal menemukan metadata sheet.");
    sheetId = sheetInfo.properties.sheetId;
    await sheets.spreadsheets.batchUpdate({ spreadsheetId: SPREADSHEET_ID, resource: { requests: [{ deleteDimension: { range: { sheetId: sheetId, dimension: "ROWS", startIndex: rowIndex, endIndex: rowIndex + 1 } } }] } });
    return { message: "Ketetapan berhasil dihapus." };
}

async function handleUpdateKetetapan(sheets, data) {
    const ketetapanData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: KETETAPAN_SHEET_NAME });
    const allData = ketetapanData.data.values;
    let rowIndex = -1; let oldDataRow;
    for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == data.id_ketetapan) {
            rowIndex = i + 1; oldDataRow = allData[i]; break;
        }
    }
    if (rowIndex === -1) throw new Error("ID Ketetapan untuk update tidak ditemukan.");
    const today = new Date();
    const tanggalKetetapanLama = new Date(oldDataRow[4]);
    const jumlahPokokBaru = parseFloat(data.jumlahPokok);
    let denda = parseFloat(oldDataRow[6]);
    const selisihBulan = (today.getFullYear() - tanggalKetetapanLama.getFullYear()) * 12 + (today.getMonth() - tanggalKetetapanLama.getMonth());
    if (selisihBulan > 0) {
        denda = selisihBulan * 0.02 * jumlahPokokBaru;
    }
    const totalTagihanBaru = jumlahPokokBaru + denda;
    const updatedRowValues = [
        oldDataRow[0], oldDataRow[1], oldDataRow[2], data.masaPajak, oldDataRow[4],
        jumlahPokokBaru, denda, totalTagihanBaru, oldDataRow[8], data.catatan || oldDataRow[9]
    ];
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID, range: `${KETETAPAN_SHEET_NAME}!A${rowIndex}`,
        valueInputOption: 'USER_ENTERED', resource: { values: [updatedRowValues] },
    });
    return { message: "Ketetapan berhasil diperbarui" };
}

async function handleCreatePembayaran(sheets, data) {
    const pembayaranData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: PEMBAYARAN_SHEET_NAME });
    const allPembayaran = pembayaranData.data.values || [];
    const newPembayaranId = `PAY-${(allPembayaran.length).toString().padStart(7, '0')}`;
    // Susun data sesuai urutan kolom worksheet terbaru
    const newRow = [[
        newPembayaranId,                // ID_Pembayaran
        data.id_ketetapan,              // ID_Ketetapan
        data.npwpd,                     // NPWPD
        data.tanggalBayar,              // TanggalBayar
        data.jumlahBayar,               // JumlahBayar
        data.metodeBayar,               // MetodeBayar
        data.waktuInput,                // WaktuInput
        data.operator,                  // Operator
        data.statusPembayaran           // StatusPembayaran
    ]];
    await sheets.spreadsheets.values.append({ spreadsheetId: SPREADSHEET_ID, range: PEMBAYARAN_SHEET_NAME, valueInputOption: 'USER_ENTERED', resource: { values: newRow } });
    // Update status ketetapan jika sudah lunas (kode lama tetap, tidak diubah)
    const ketetapanData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: KETETAPAN_SHEET_NAME });
    const allKetetapan = ketetapanData.data.values; let rowIndex = -1; let totalTagihan = 0;
    for (let i = 1; i < allKetetapan.length; i++) {
        if (allKetetapan[i][0] == data.id_ketetapan) {
            rowIndex = i + 1; totalTagihan = parseFloat(allKetetapan[i][7]); break;
        }
    }
    if (rowIndex === -1) throw new Error("ID Ketetapan tidak ditemukan untuk update status.");
    const pembayaranUntukKetetapanIni = (await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: PEMBAYARAN_SHEET_NAME })).data.values || [];
    let totalSudahDibayar = 0;
    pembayaranUntukKetetapanIni.forEach(row => { if (row[1] == data.id_ketetapan) totalSudahDibayar += parseFloat(row[4]); });
    if (totalSudahDibayar >= totalTagihan) {
        await sheets.spreadsheets.values.update({ spreadsheetId: SPREADSHEET_ID, range: `${KETETAPAN_SHEET_NAME}!I${rowIndex}`, valueInputOption: 'USER_ENTERED', resource: { values: [["Lunas"]] } });
    }
    return { message: "Pembayaran berhasil dicatat." };
}

// Tambahkan handler deletePembayaran
async function handleDeletePembayaran(sheets, data) {
    const pembayaranSheetData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: PEMBAYARAN_SHEET_NAME });
    const allData = pembayaranSheetData.data.values;
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == data.id_pembayaran) { rowIndex = i; break; }
    }
    if (rowIndex === -1) throw new Error("ID Pembayaran untuk dihapus tidak ditemukan.");
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [PEMBAYARAN_SHEET_NAME], fields: 'sheets(properties(sheetId,title))' });
    const sheetInfo = sheetMetadata.data.sheets.find(s => s.properties.title === PEMBAYARAN_SHEET_NAME);
    if (!sheetInfo) throw new Error("Gagal menemukan metadata sheet.");
    const sheetId = sheetInfo.properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }]
        }
    });
    return { message: "Pembayaran berhasil dihapus." };
}

// Tambahkan handler deleteFiskal
async function handleDeleteFiskal(sheets, data) {
    // Ganti dengan nama worksheet fiskal yang sesuai
    const FISKAL_SHEET_NAME = "Fiskal";
    const fiskalSheetData = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: FISKAL_SHEET_NAME });
    const allData = fiskalSheetData.data.values;
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == data.npwpd) { rowIndex = i; break; }
    }
    if (rowIndex === -1) throw new Error("NPWPD untuk dihapus di fiskal tidak ditemukan.");
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [FISKAL_SHEET_NAME], fields: 'sheets(properties(sheetId,title))' });
    const sheetInfo = sheetMetadata.data.sheets.find(s => s.properties.title === FISKAL_SHEET_NAME);
    if (!sheetInfo) throw new Error("Gagal menemukan metadata sheet fiskal.");
    const sheetId = sheetInfo.properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1
                    }
                }
            }]
        }
    });
    return { message: "Data fiskal berhasil dihapus." };
}

// =================================================================
// Fungsi-fungsi Pembantu (Helpers)
// =================================================================

function formatSheetData(values) {
    if (!values || values.length <= 1) return [];
    const headers = values.shift();
    return values.map(row => { let obj = {}; headers.forEach((header, index) => { obj[header] = row[index] || ""; }); return obj; });
}

async function uploadFile(drive, base64Data, fileName) {
    if (!base64Data) return "";
    const splitData = base64Data.split(",");
    const contentType = splitData[0].match(/:(.*?);/)[1];
    const decodedData = Buffer.from(splitData[1], 'base64');
    const fileMetadata = { name: fileName, parents: [FOLDER_ID] };
    const media = { mimeType: contentType, body: require('stream').Readable.from(decodedData) };
    const file = await drive.files.create({ resource: fileMetadata, media: media, fields: 'id, webViewLink' });
    await drive.permissions.create({ fileId: file.data.id, resource: { role: 'reader', type: 'anyone' } });
    return file.data.webViewLink.replace("view?usp=drivesdk", "view?usp=sharing");
}