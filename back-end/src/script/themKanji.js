const mysql = require('mysql2/promise');
const fs = require('fs');

async function seedKanjis() {
    const connection = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '', database: 'jp_dict'
    });

    console.log("Đã kết nối DB. Bắt đầu đọc file Kanji bản Hán Nôm...");

    const files = ['./data/kanji_bank_1.json', './data/kanji_bank_2.json'];

    for (const filePath of files) {
        if (!fs.existsSync(filePath)) continue;

        const rawData = fs.readFileSync(filePath, 'utf8');
        const kanjiData = JSON.parse(rawData);
        console.log(`Đang nạp ${kanjiData.length} chữ Kanji từ ${filePath}...`);

        await connection.beginTransaction();

        try {
            for (const item of kanjiData) {
                // Ánh xạ lại đúng vị trí theo file JSON của bạn
                const characterKanji = item[0];
                const sinoVietnamese = item[1]; // Index 1 bây giờ là Âm Hán Việt
                const onyomi = item[2] || '';   // Trống
                const kunyomi = item[3] || '';  // Trống
                
                // Mảng ý nghĩa (Nối các dòng lại với nhau bằng dấu xuống dòng)
                const meaningsArray = item[4] || [];
                const meaning = meaningsArray.join('\n'); 

                // Object chứa thông số metadata
                const meta = item[5] || {};
                const strokeCount = meta.Strokes ? parseInt(meta.Strokes) : null;
                const components = meta.Shape || null; // Cấu tạo chữ (VD: ⿰口亜)

                const now = new Date();

                await connection.execute(
                    `INSERT IGNORE INTO Kanjis 
                    (characterKanji, sinoVietnamese, meaning, onyomi, kunyomi, strokeCount, components, createdAt, updatedAt) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        characterKanji, 
                        sinoVietnamese, 
                        meaning, 
                        onyomi, 
                        kunyomi, 
                        strokeCount,
                        components,
                        now, 
                        now
                    ]
                );
            }
            await connection.commit();
            console.log(`✅ Nạp thành công file ${filePath}!`);
        } catch (error) {
            await connection.rollback();
            console.error(`❌ Lỗi khi nạp ${filePath}:`, error);
        }
    }

    await connection.end();
    console.log("🎉 Hoàn tất quá trình nạp dữ liệu Kanji!");
}

seedKanjis();