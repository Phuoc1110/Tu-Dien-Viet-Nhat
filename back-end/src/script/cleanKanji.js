const mysql = require('mysql2/promise');

async function cleanMeanings() {
    const connection = await mysql.createConnection({
        host: 'localhost', user: 'root', password: '', database: 'jp_dict'
    });

    console.log("🧹 Bắt đầu tổng vệ sinh khoảng trắng thừa trong bảng Kanji...");

    try {
        // Lấy tất cả Kanji đang có ý nghĩa
        const [rows] = await connection.execute('SELECT id, meaning FROM Kanjis WHERE meaning IS NOT NULL');
        let updateCount = 0;

        await connection.beginTransaction();

        for (const row of rows) {
            // CÔNG THỨC DỌN DẸP BẰNG REGEX:
            let cleanedMeaning = row.meaning
                .replace(/[ \t]+/g, ' ')       // 1. Biến nhiều dấu cách/tab liên tiếp thành 1 dấu cách duy nhất
                .replace(/\n\s*\n/g, '\n')     // 2. Xóa các dòng trống thừa (biến nhiều dấu enter thành 1 dấu enter)
                .trim();                       // 3. Cắt bỏ khoảng trắng ở tận cùng 2 đầu chuỗi

            // Chỉ cập nhật nếu dữ liệu thực sự có sự thay đổi
            if (cleanedMeaning !== row.meaning) {
                await connection.execute(
                    'UPDATE Kanjis SET meaning = ?, updatedAt = ? WHERE id = ?',
                    [cleanedMeaning, new Date(), row.id]
                );
                updateCount++;
            }
        }

        await connection.commit();
        console.log(`✨ Dọn dẹp hoàn tất! Đã "tắm rửa" sạch sẽ cho ${updateCount} chữ Kanji.`);

    } catch (error) {
        await connection.rollback();
        console.error("❌ Có lỗi xảy ra trong lúc dọn dẹp:", error);
    } finally {
        await connection.end();
    }
}

cleanMeanings();