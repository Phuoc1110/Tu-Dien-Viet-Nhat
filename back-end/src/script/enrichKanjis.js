const mysql = require('mysql2/promise');
const fs = require('fs');

async function enrichKanjis() {
    // 1. Kết nối DB
    const connection = await mysql.createConnection({
        host: 'localhost', 
        user: 'root', 
        password: '', 
        database: 'jp_dict'
    });

    console.log("Bắt đầu đắp thêm âm On, Kun và JLPT vào Database...");

    // 2. Đọc file kanji.json của bạn
    const filePath = './data/kanji.json';
    if (!fs.existsSync(filePath)) {
        console.log(`❌ Không tìm thấy file ${filePath}!`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(filePath, 'utf8');
    const kanjiDict = JSON.parse(rawData);
    
    // Lấy tất cả các chữ Kanji ra thành 1 mảng
    const kanjiCharacters = Object.keys(kanjiDict); 
    console.log(`Đã đọc ${kanjiCharacters.length} chữ Kanji từ file. Đang cập nhật vào DB...`);

    await connection.beginTransaction();

    try {
        let updateCount = 0;

        // 3. Lặp qua từng chữ và update vào DB
        for (const char of kanjiCharacters) {
            const data = kanjiDict[char];
            
            // Xử lý mảng âm On / Kun thành chuỗi cách nhau bởi dấu phẩy
            const onyomi = data.readings_on ? data.readings_on.join(', ') : null;
            const kunyomi = data.readings_kun ? data.readings_kun.join(', ') : null;
            
            // Lấy cấp độ JLPT (Ưu tiên bản mới, nếu không có lấy bản cũ)
            const jlptLevel = data.jlpt_new || data.jlpt_old || null;

            // Chỉ update nếu thực sự có âm On/Kun hoặc JLPT
            if (onyomi || kunyomi || jlptLevel) {
                const now = new Date();
                
                // Dùng lệnh UPDATE để không làm mất âm Hán Việt đã có
                const [result] = await connection.execute(
                    `UPDATE Kanjis 
                     SET onyomi = ?, kunyomi = ?, jlptLevel = ?, updatedAt = ? 
                     WHERE characterKanji = ?`,
                    [onyomi, kunyomi, jlptLevel, now, char]
                );

                if (result.affectedRows > 0) {
                    updateCount++;
                }
            }
        }

        await connection.commit();
        console.log(`🎉 Hoàn tất! Đã cập nhật thành công âm On/Kun cho ${updateCount} chữ Kanji!`);

    } catch (error) {
        await connection.rollback();
        console.error("❌ Có lỗi xảy ra khi cập nhật:", error);
    } finally {
        await connection.end();
    }
}

enrichKanjis();