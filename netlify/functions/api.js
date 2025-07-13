// File: netlify/functions/api.js
const { google } = require('googleapis');

const SPREADSHEET_ID = '1x3EmFN0kM7x9Th0ZxsHEWX7hFNU6Vum8'; // <-- GANTI DENGAN ID ANDA

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
exports.handler = async (event, context) => {
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