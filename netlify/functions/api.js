// File: netlify/functions/api.js (Versi Final dan Lengkap)
const { google } = require('googleapis');

// Ganti dengan ID Google Sheet Anda
const SPREADSHEET_ID = '1HGO9-MsOyezFU3B8opAc8GeCsLshKNSSWyb3cEBxCoY';

// Fungsi otentikasi
async function getAuthClient() {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
}

// Fungsi pembantu untuk memformat data dari sheet
function formatSheetData(values) {
    if (!values || values.length <= 1) return [];
    const headers = values.shift();
    return values.map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index] || "";
        });
        return obj;
    });
}

// Handler utama Netlify Function
exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }

    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        let responseData;

        // Menangani GET request untuk membaca semua data
        if (event.httpMethod === 'GET') {
            const ranges = ["datawp", "Wilayah", "MasterPajakRetribusi", "KetetapanPajak"];
            const response = await sheets.spreadsheets.values.batchGet({
                spreadsheetId: SPREADSHEET_ID,
                ranges: ranges,
            });

            responseData = {
                wajibPajak: formatSheetData(response.data.valueRanges[0].values),
                wilayah: formatSheetData(response.data.valueRanges[1].values),
                masterPajak: formatSheetData(response.data.valueRanges[2].values),
                ketetapan: formatSheetData(response.data.valueRanges[3].values),
            };
        } else {
            // Logika untuk POST akan kita tambahkan nanti
            throw new Error(`Metode HTTP ${event.httpMethod} tidak didukung saat ini.`);
        }
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ status: 'gagal', message: error.message }),
        };
    }
};