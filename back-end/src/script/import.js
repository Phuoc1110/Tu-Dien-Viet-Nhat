//SRC: https://github.com/jamsinclair/open-anki-jlpt-decks/tree/main?tab=readme-ov-file


const mysql = require('mysql2/promise');
const fs = require('fs');
const csv = require('csv-parser');
const wanakana = require('wanakana');

async function importN5Final() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Mật khẩu của bạn
        database: 'jp_dict'
    });

    console.log("🚀 Đang nạp dữ liệu N1 tiếng Việt...");
    const results = [];

    // Lưu ý: Đổi tên file 'n1-2.csv' cho đúng với file bạn vừa lưu
    fs.createReadStream('data/n1-2.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let count = 0;
            for (let row of results) {
                try {
                    // 1. Lấy dữ liệu từ các cột tương ứng
                    const word = row.expression;
                    const reading = row.reading;
                    const definition = row.vietnamese_definition;
                    const romaji = wanakana.toRomaji(reading);
                    
                    // 2. Tách JLPT Level từ tags (JLPT_N1 -> 1)
                    let jlpt = 1;
                    if (row.tags.includes('JLPT_N')) {
                        jlpt = parseInt(row.tags.split('JLPT_N')[1]);
                    }

                    // 3. Kiểm tra trùng và nạp vào bảng Words
                    const [existing] = await connection.execute(
                        "SELECT id FROM Words WHERE word = ? AND reading = ?",
                        [word, reading]
                    );

                    if (existing.length === 0) {
                        const [wordResult] = await connection.execute(
                            "INSERT INTO Words (word, reading, romaji, jlptLevel) VALUES (?, ?, ?, ?)",
                            [word, reading, romaji, jlpt]
                        );

                        const wordId = wordResult.insertId;

                        // 4. Nạp vào bảng Meanings
                        await connection.execute(
                            "INSERT INTO Meanings (wordId, definition) VALUES (?, ?)",
                            [wordId, definition]
                        );
                        count++;
                    }
                } catch (err) {
                    console.error(`❌ Lỗi tại từ ${row.expression}:`, err.message);
                }
            }
            console.log(`🎉 Thành công! Đã nạp mới ${count} từ vựng vào Database.`);
            await connection.end();
        });
}

importN5Final();