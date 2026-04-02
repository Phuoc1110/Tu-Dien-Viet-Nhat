const fs = require('fs');
const path = require('path');

const svgDir = './data/kanjivg-20250816-all/kanji'; // Thư mục chứa các file SVG
const outputFile = './data/stroke_paths.json'; // File đầu ra bạn cần

const result = {};

const files = fs.readdirSync(svgDir);

files.forEach(file => {
  if (!file.endsWith('.svg')) return;

  const content = fs.readFileSync(path.join(svgDir, file), 'utf-8');
  
  // Tên file của KanjiVG có định dạng mã Hex (VD: 04e00.svg là chữ 一)
  // Bóc tách mã Hex và chuyển ngược lại thành ký tự Kanji thực tế
  const hexCode = file.split('-')[0].replace('.svg', '');
  const char = String.fromCodePoint(parseInt(hexCode, 16));

  // Dùng Regex để quét tìm toàn bộ tọa độ vẽ (thuộc tính d="...") trong file SVG
  const paths = [...content.matchAll(/<path[^>]*d="([^"]+)"/g)];
  
  if (paths.length > 0) {
    result[char] = paths.map((match, index) => ({
      order: index + 1,
      d: match[1] // Lưu chuỗi tọa độ M... L...
    }));
  }
});

// Xuất kết quả ra file JSON
fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
console.log(`🎉 Đã tạo thành công ${outputFile}! Đã trích xuất nét viết cho ${Object.keys(result).length} chữ Kanji.`);