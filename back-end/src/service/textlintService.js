import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const translateMessageToVietnamese = (message) => {
    let viMsg = message;

    // Lỗi lặp trợ từ
    viMsg = viMsg.replace(/"(.*?)" が連続して(\d+)回使われています。/g, 'Trợ từ "$1" bị lặp lại $2 lần liên tiếp.');
    viMsg = viMsg.replace(/一つの文で"(.*?)"が(\d+)回出現しています。/g, 'Trợ từ "$1" xuất hiện quá nhiều lần ($2 lần) trong cùng một câu.');
    
    // Lỗi dấu câu
    viMsg = viMsg.replace(/文末が"(.*?)"で終わっていません。/g, 'Cuối câu chưa kết thúc bằng dấu "$1".');
    viMsg = viMsg.replace(/日本語文章では"(.*?)"を使用します/g, 'Tiếng Nhật sử dụng dấu "$1"');
    viMsg = viMsg.replace(/"(.*?)"を"(.*?)"に置き換えてください/g, 'Vui lòng thay "$1" bằng "$2"');
    
    // Lỗi văn phong
    viMsg = viMsg.replace(/常体\(だ・である\)と敬体\(です・ます\)が混じっています。/g, 'Văn phong không nhất quán: Đang dùng lẫn lộn giữa thể thường (Da/Dearu) và thể lịch sự (Desu/Masu).');
    
    // Lỗi câu dài / khó đọc
    viMsg = viMsg.replace(/漢字が連続しています（(\d+)文字）。/g, 'Có quá nhiều chữ Kanji liên tiếp nhau ($1 chữ). Cân nhắc chèn thêm Hiragana.');
    viMsg = viMsg.replace(/(\d+)文字以上の文です。/g, 'Câu văn quá dài (trên $1 ký tự). Cân nhắc tách thành các câu ngắn hơn.');
    viMsg = viMsg.replace(/1文の長さが(\d+)文字を超えています。/g, 'Độ dài của một câu đã vượt quá $1 ký tự.');
    viMsg = viMsg.replace(/1文中に読点「、」が(\d+)個以上あります。/g, 'Một câu có quá nhiều dấu phẩy (từ $1 dấu trở lên).');

    // Các từ khoá chung
    viMsg = viMsg.replace(/理由:/g, 'Lý do:');
    viMsg = viMsg.replace(/修正:/g, 'Cách sửa:');
    viMsg = viMsg.replace(/例:/g, 'Ví dụ:');
    
    // Lý do và cách sửa cho dấu câu
    viMsg = viMsg.replace(/句点は文の境界を明確にし、読み手の理解を助けます/g, 'Dấu chấm giúp phân định rõ ràng ranh giới của câu và giúp người đọc dễ hiểu hơn.');
    viMsg = viMsg.replace(/適切な文末表現で文を完結させ、句点を追加してください/g, 'Vui lòng hoàn thành câu với cách diễn đạt cuối câu phù hợp và thêm dấu chấm.');
    viMsg = viMsg.replace(/「〜です。」「〜ます。」「〜でした。」など/g, '「〜です。」「〜ます。」「〜でした。」 v.v...');

    return viMsg;
};

let checkTextGrammar = (text) => {
    return new Promise((resolve, reject) => {
        try {
            if (!text || text.trim() === "") {
                return resolve([]);
            }
            // Create a temporary file in the root of back-end
            const tempFileName = `temp_textlint_${crypto.randomBytes(8).toString('hex')}.txt`;
            const tempFilePath = path.join(__dirname, '../../', tempFileName);
            
            fs.writeFileSync(tempFilePath, text);
            
            let result = [];
            try {
                // Run textlint and format output as JSON
                console.log("Running textlint on temp file:", tempFilePath);
                const stdout = execSync(`npx textlint --preset japanese --preset ja-technical-writing --format json ${tempFilePath}`, { cwd: path.join(__dirname, '../../') });
                console.log("Textlint stdout:", stdout.toString());
                const parsed = JSON.parse(stdout.toString());
                if (parsed && parsed.length > 0 && parsed[0].messages) {
                    result = parsed[0].messages.map(msg => ({
                        ...msg,
                        message: translateMessageToVietnamese(msg.message)
                    }));
                }
            } catch (error) {
                console.log("Textlint error caught!");
                // textlint returns exit code 1 if it finds errors, throwing an exception in execSync
                if (error.stdout) {
                    try {
                        const parsed = JSON.parse(error.stdout.toString());
                        if (parsed && parsed.length > 0 && parsed[0].messages) {
                            console.log("Parsed error messages:", parsed[0].messages);
                            result = parsed[0].messages.map(msg => ({
                                ...msg,
                                message: translateMessageToVietnamese(msg.message)
                            }));
                            console.log("Translated result:", result);
                        }
                    } catch (e) {
                        console.error("Error parsing textlint output:", e);
                    }
                } else {
                    console.error("Textlint execution error:", error);
                }
            }
            
            // Clean up temporary file
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = {
    checkTextGrammar
};
