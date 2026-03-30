const mysql = require('mysql2/promise');

async function linkKanjis() {
    // 1. Kết nối database
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Điền mật khẩu MySQL của bạn nếu có
        database: 'jp_dict' 
    });

    console.log("🔍 Đang quét Database để nối Từ vựng và Kanji...");
    let successCount = 0;

    try {
        // 2. Lấy toàn bộ từ vựng hiện có
        const [words] = await connection.execute("SELECT id, word FROM Words");

        for (let w of words) {
            // Tách từ vựng thành từng ký tự (VD: "学校" -> ['学', '校'])
            let chars = w.word.split(''); 

            for (let char of chars) {
                // Kiểm tra xem ký tự này có phải là Kanji không (dựa vào dải mã Unicode)
                if (char.match(/[\u4e00-\u9faf\u3400-\u4dbf]/)) {
                    
                    // 3. Tìm Kanji này trong bảng Kanjis của bạn
                    const [kanjis] = await connection.execute(
                        "SELECT id FROM Kanjis WHERE characterKanji = ?", 
                        [char]
                    );

                    // Nếu tìm thấy chữ Kanji đó trong CSDL
                    if (kanjis.length > 0) {
                        // 4. Lưu liên kết vào bảng WordKanjis (Dùng INSERT IGNORE để không bị lỗi nếu đã nối rồi)
                        await connection.execute(
                            "INSERT IGNORE INTO WordKanjis (wordId, kanjiId) VALUES (?, ?)",
                            [w.id, kanjis[0].id]
                        );
                        successCount++;
                    }
                }
            }
        }
        console.log(`🎉 HOÀN TẤT! Đã tạo thành công ${successCount} liên kết giữa Từ vựng và Kanji.`);
    } catch (error) {
        console.error("❌ Lỗi:", error);
    } finally {
        await connection.end();
    }
}

linkKanjis();