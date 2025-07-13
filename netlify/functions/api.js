// File: netlify/functions/api.js (Versi Final dengan CRUD WP)
const { google } = require('googleapis');

// --- KONFIGURASI ---
const SPREADSHEET_ID = '1HGO9-MsOyezFU3B8opAc8GeCsLshKNSSWyb3cEBxCoY'; // ID Google Sheet Anda
const FOLDER_ID = "1x3EmFN0kM7x9Th0ZxsHEWX7hFNU6Vum8"; // ID Folder Google Drive Anda

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

// Fungsi pembantu untuk memformat data dari sheet
function formatSheetData(values) {
    if (!values || values.length <= 1) return [];
    const headers = values.shift();
    return values.map(row => {
        let obj = {};
        headers.forEach((header, index) => { obj[header] = row[index] || ""; });
        return obj;
    });
}

// Handler utama Netlify Function
exports.handler = async (event) => {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };

    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        
        if (event.httpMethod === 'GET') {
            const ranges = [WP_SHEET_NAME, WILAYAH_SHEET_NAME, MASTER_PAJAK_SHEET_NAME, KETETAPAN_SHEET_NAME];
            const response = await sheets.spreadsheets.values.batchGet({ spreadsheetId: SPREADSHEET_ID, ranges });
            const responseData = {
                wajibPajak: formatSheetData(response.data.valueRanges[0].values),
                wilayah: formatSheetData(response.data.valueRanges[1].values),
                masterPajak: formatSheetData(response.data.valueRanges[2].values),
                ketetapan: formatSheetData(response.data.valueRanges[3].values),
            };
            return { statusCode: 200, headers, body: JSON.stringify(responseData) };
        }
        
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            let resultMessage = {};

            switch (body.action) {
                case 'createWp':
                    resultMessage = await handleCreateWp(auth, sheets, body);
                    break;
                case 'updateWp':
                    resultMessage = await handleUpdateWp(sheets, body);
                    break;
                case 'deleteWp':
                    resultMessage = await handleDeleteWp(sheets, body);
                    break;
                // Tambahkan case untuk ketetapan nanti
                default:
                    throw new Error(`Aksi '${body.action}' tidak dikenali`);
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

async function handleCreateWp(auth, sheets, data) {
    const drive = google.drive({ version: 'v3', auth });
    
    // Fungsi upload file
    async function uploadFile(base64Data, fileName) {
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

    const [urlFotoPemilik, urlFotoUsaha, urlFotoKtp] = await Promise.all([
        uploadFile(data.fotoPemilik, `pemilik_${data.npwpd}`),
        uploadFile(data.fotoTempatUsaha, `usaha_${data.npwpd}`),
        uploadFile(data.fotoKtp, `ktp_${data.npwpd}`)
    ]);

    const newRow = [[
        data.npwpd, data.namaUsaha, data.namaPemilik, data.nikKtp, data.alamat, 
        data.telephone, data.kelurahan, data.kecamatan, urlFotoPemilik, urlFotoUsaha, urlFotoKtp
    ]];

    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: WP_SHEET_NAME,
        valueInputOption: 'USER_ENTERED',
        resource: { values: newRow },
    });

    return { message: "Data WP baru berhasil dibuat" };
}

async function handleUpdateWp(sheets, data) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: WP_SHEET_NAME });
    const allData = response.data.values;
    let rowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == data.npwpd) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex === -1) throw new Error("NPWPD untuk update tidak ditemukan.");

    const updatedRow = [
        data.npwpd, data.namaUsaha, data.namaPemilik, data.nikKtp, data.alamat,
        data.telephone, data.kelurahan, data.kecamatan
    ];

    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${WP_SHEET_NAME}!A${rowIndex}:H${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [updatedRow] },
    });
    
    return { message: "Data WP berhasil diperbarui" };
}

async function handleDeleteWp(sheets, data) {
    const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: WP_SHEET_NAME });
    const allData = response.data.values;
    let rowIndex = -1;
    let sheetId = -1;

    for (let i = 1; i < allData.length; i++) {
        if (allData[i][0] == data.npwpd) {
            rowIndex = i;
            break;
        }
    }
    if (rowIndex === -1) throw new Error("NPWPD untuk dihapus tidak ditemukan.");

    // Dapatkan sheetId untuk operasi penghapusan baris
    const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID, ranges: [WP_SHEET_NAME], fields: 'sheets(properties(sheetId,title))' });
    const sheetInfo = sheetMetadata.data.sheets.find(s => s.properties.title === WP_SHEET_NAME);
    if (!sheetInfo) throw new Error("Gagal menemukan metadata sheet.");
    sheetId = sheetInfo.properties.sheetId;

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

    return { message: "Data WP berhasil dihapus" };
}