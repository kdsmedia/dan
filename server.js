const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// =======================================================
// A. INILISIALISASI GEMINI AI
// =======================================================

// !!! Pastikan kunci ini adalah kunci API Gemini Anda yang sebenarnya !!!
const GEMINI_API_KEY = 'AIzaSyAit-i5SLcADlifRRqwIW2UYGpUQqQGmoc'; 

// --- PERBAIKAN PENTING DI SINI: MENGHILANGKAN PENGECKEKAN KUNCI YANG SALAH ---
// Blok pengecekan lama dihapus agar program tidak terhenti setelah kunci dimasukkan.
if (!GEMINI_API_KEY) {
    console.error("FATAL ERROR: Kunci API Gemini kosong. Harap masukkan kunci API yang valid.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", // Model yang cepat dan efisien untuk chat
});

// Fungsi untuk mendapatkan balasan dari AI
async function getAiResponse(prompt) {
    try {
        const result = await aiModel.generateContent(prompt);
        // Hapus karakter markdown yang berlebihan atau tidak perlu
        const responseText = result.text.replace(/[*_]/g, ''); 
        return responseText;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Maaf, terjadi kesalahan pada sistem AI kami. Mohon coba lagi nanti. (Kode error: G-API)";
    }
}


// =======================================================
// B. KONFIGURASI BOT WHATSAPP
// =======================================================

// Objek untuk melacak sesi chat AI per pengguna (key: chat ID, value: true/false)
const aiChatSessions = {}; 

const client = new Client({
    authStrategy: new LocalAuth(), // Menyimpan sesi
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

// Teks Menu Utama
const MAIN_MENU = 
`====================
      SELAMAT DATANG
====================
*Silakan pilih menu dengan mengetikkan ANGKA yang sesuai:*

*1.* CHAT AI (Ngobrol otomatis)
*2.* TIKTOK (Kunjungi Akun Kami)
*3.* YOUTUBE (Lihat Video Kami)
*4.* SPOTIFY (Dengarkan Playlist Kami)
====================
Ketik *0* untuk keluar dari CHAT AI atau kembali ke menu.
Ketik *00* untuk menampilkan menu ini lagi.
====================
`;

// --- Event Handler Dasar ---
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Silakan scan QR code di atas menggunakan aplikasi WhatsApp Anda.');
});

client.on('ready', () => {
    console.log('Client is ready! Bot telah terhubung dan siap beroperasi. 🤖');
});


// =======================================================
// C. LOGIKA PENANGANAN PESAN
// =======================================================
client.on('message', async (msg) => {
    const body = msg.body.trim();
    const chatId = msg.from; 
    
    // ABAIKAN PESAN DARI DIRI SENDIRI UNTUK MENCEGAH LOOP
    if (msg.id.fromMe) return;

    // Coba konversi body menjadi angka
    const choice = parseInt(body);

    // Cek status perintah
    const isSpecialCommand = body === '00' || body === '0';
    const isValidMenuChoice = choice >= 1 && choice <= 4;
    
    // --- 1. HANDLE PERINTAH KHUSUS (00 dan 0) ---
    if (isSpecialCommand) {
        // Jika sedang dalam mode AI, keluar dari mode AI
        if (aiChatSessions[chatId]) {
            aiChatSessions[chatId] = false;
            msg.reply('Anda telah keluar dari *Mode CHAT AI*.');
        }
        
        // Selalu tampilkan menu utama
        client.sendMessage(chatId, MAIN_MENU);
        return;
    }

    // --- 2. HANDLE PILIHAN MENU (1, 2, 3, 4) ---
    if (isValidMenuChoice) {
        // Pastikan mode AI di-reset jika memilih menu lain
        aiChatSessions[chatId] = false; 

        switch (choice) {
            case 1:
                // AKTIFKAN MODE CHAT AI
                aiChatSessions[chatId] = true; 
                msg.reply(
                    'Anda memilih *1. CHAT AI*. Silakan mulai mengobrol dengan saya! \n\n🤖 *Ketik 0 atau 00 untuk keluar dari mode Chat AI dan kembali ke Menu Utama.*'
                );
                break;
            case 2:
                msg.reply('Anda memilih *2. TIKTOK*. Kunjungi akun kami: \n[https://www.tiktok.com/@sidhanie]');
                break;
            case 3:
                msg.reply('Anda memilih *3. YOUTUBE*. Tonton konten menarik kami: \n[https://www.youtube.com/@sidhanie06]');
                break;
            case 4:
                msg.reply('Anda memilih *4. SPOTIFY*. Dengarkan playlist kami: \n[https://open.spotify.com]');
                break;
        }
        return; 
    }

    // --- 3. LOGIKA CHAT AI OTOMATIS ---
    // Jika pengguna berada dalam mode Chat AI (pilihan 1)
    if (aiChatSessions[chatId] === true) {
        // Abaikan pesan kosong
        if (body.length === 0) return; 

        // Kirim indikator 'typing...' atau balasan cepat
        msg.reply('...'); 
        
        // Hapus logika CHAT SIDHANIE dan ganti dengan CHAT AI lagi
        const aiResponse = await getAiResponse(body);
        client.sendMessage(chatId, aiResponse); 
        return;
    }

    // --- 4. HANDLE PESAN TIDAK DIKENALI (Tampilkan Menu Otomatis) ---
    // Ini adalah heuristik untuk pengguna baru atau pesan yang tidak dikenali
    if (body.length > 0) {
        // Tampilkan menu utama sebagai panduan
        client.sendMessage(chatId, `Mohon maaf, saya tidak mengerti input Anda. Silakan pilih dari menu di bawah.`);
        client.sendMessage(chatId, MAIN_MENU);
    }
});

client.initialize();
