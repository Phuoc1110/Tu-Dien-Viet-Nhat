//https://downloads.tatoeba.org/

const fs = require('fs');
const readline = require('readline');
const mysql = require('mysql2/promise');
const kuromoji = require('kuromoji');
const path = require('path');

// Đường dẫn tới các file TSV
const LINKS_FILE = './vie-jpn_links.tsv';
const VIE_FILE = './vie_sentences.tsv';
const JPN_FILE = './jpn_sentences.tsv';

const idMap = new Map(); // Lưu liên kết 2 chiều giữa ID Nhật và ID Việt
const vieSentences = new Map(); // Lưu { ID_Việt => Nội dung câu Việt }

// Hàm đọc file từng dòng (để không bị tràn RAM với file lớn)
async function readTsvLineByLine(filePath, callback) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const columns = line.split('\t');
    await callback(columns);
  }
}

// Hàm khởi tạo Kuromoji dưới dạng Promise
function initKuromoji() {
  return new Promise((resolve, reject) => {
    // require.resolve('kuromoji') sẽ trả về đường dẫn tới file chạy chính của thư viện (nằm trong thư mục build/)
    const kuromojiCorePath = require.resolve('kuromoji');
    
    // Từ file đó, ta lấy thư mục cha (build), rồi lùi ra ngoài 1 cấp và vào thư mục 'dict'
    const dicPath = path.join(path.dirname(kuromojiCorePath), '../dict');
    
    kuromoji.builder({ dicPath: dicPath }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
}

async function main() {
  console.log('1. Đang tải Kuromoji dictionary...');
  const tokenizer = await initKuromoji();

  console.log('2. Đang đọc file links để tạo bản đồ ghép nối...');
  await readTsvLineByLine(LINKS_FILE, async (cols) => {
    if (cols.length >= 2) {
      // Lưu ghép nối 2 chiều vì file link có thể đặt ID ngôn ngữ nào trước cũng được
      idMap.set(cols[0], cols[1]);
      idMap.set(cols[1], cols[0]);
    }
  });

  console.log('3. Đang đọc các câu tiếng Việt vào bộ nhớ...');
  await readTsvLineByLine(VIE_FILE, async (cols) => {
    if (cols.length >= 3) {
      const id = cols[0];
      const text = cols[2].trim();
      vieSentences.set(id, text);
    }
  });

  console.log('4. Kết nối Database...');
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root', // Thay bằng user DB
    password: '', // Thay bằng mật khẩu DB
    database: 'jp_dict'
  });

  console.log('5. Đang xử lý câu tiếng Nhật và Insert vào Database...');
  let processedCount = 0;
  let insertedCount = 0;

  await readTsvLineByLine(JPN_FILE, async (cols) => {
    if (cols.length < 3) return;
    
    const jpnId = cols[0];
    const jpnText = cols[2].trim();

    // Tìm ID tiếng Việt tương ứng thông qua idMap
    const vieId = idMap.get(jpnId);
    const vieText = vieSentences.get(vieId);

    // Nếu câu Nhật này có bản dịch tiếng Việt
    if (vieText) {
      processedCount++;
      
      // Tách từ câu tiếng Nhật
      const tokens = tokenizer.tokenize(jpnText);
      
      // Lọc ra các từ gốc (basic_form) để tra DB. Loại bỏ các ký tự đặc biệt.
      const baseWords = [...new Set(
        tokens
          .map(t => t.basic_form)
          .filter(w => w !== '*' && w.length > 0)
      )];

      for (const word of baseWords) {
        // Tìm xem từ gốc này có tồn tại trong bảng Words của bạn không
        const [rows] = await connection.execute(
          'SELECT id FROM Words WHERE word = ? LIMIT 1',
          [word]
        );

        if (rows.length > 0) {
          const wordId = rows[0].id;

          // Insert cặp câu vào bảng Examples
          try {
            await connection.execute(
              `INSERT INTO Examples (wordId, japaneseSentence, vietnameseTranslation) 
               VALUES (?, ?, ?)`,
              [wordId, jpnText, vieText]
            );
            insertedCount++;
          } catch (err) {
            console.error(`Lỗi Insert: ${err.message}`);
          }
        }
      }

      if (processedCount % 500 === 0) {
        console.log(`Đã xử lý ${processedCount} cặp câu. Đã insert ${insertedCount} ví dụ...`);
      }
    }
  });

  console.log(`\n🎉 HOÀN THÀNH!`);
  console.log(`Tổng số cặp câu đã duyệt: ${processedCount}`);
  console.log(`Tổng số ví dụ đã thêm vào DB: ${insertedCount}`);

  await connection.end();
}

main().catch(console.error);