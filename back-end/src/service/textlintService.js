import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with the provided API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let checkTextGrammar = async (text) => {
    if (!text || text.trim() === "") {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
        
        const prompt = `Bạn là một chuyên gia ngôn ngữ học tiếng Nhật khắt khe. Hãy phân tích đoạn văn bản tiếng Nhật sau thật kỹ lưỡng.
Nếu không có lỗi, hãy trả về một mảng rỗng: []. 
Nếu có BẤT KỲ lỗi nào (ngữ pháp, dấu câu, cách diễn đạt thiếu tự nhiên, sai trợ từ, sai thì), hãy trả về một mảng JSON chứa các object. 
Mỗi object bắt buộc phải có đúng các key sau: 
- "message": Lời giải thích rõ ràng về lỗi và cách sửa bằng tiếng Việt.
- "line": Số dòng chứa lỗi (bắt đầu từ 1).
- "column": Vị trí ký tự bị lỗi trên dòng (bắt đầu từ 1).
- "index": Vị trí ký tự trong toàn bộ văn bản (bắt đầu từ 0).

TUYỆT ĐỐI CHỈ TRẢ VỀ DUY NHẤT CHUỖI JSON MẢNG (ARRAY). KHÔNG thêm bất kỳ câu chào hỏi, giải thích, hay ký tự markdown nào bên ngoài mảng JSON. 

Văn bản cần kiểm tra:
${text}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Trích xuất phần JSON mảng bằng Regex để loại bỏ các text dư thừa nếu AI có lỡ thêm vào
        let cleanJson = responseText;
        const match = responseText.match(/\[[\s\S]*\]/);
        if (match) {
            cleanJson = match[0];
        }

        const parsed = JSON.parse(cleanJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Gemini API Error in Grammar Check:", error);
        throw new Error("Không thể kết nối đến máy chủ AI (Lỗi mạng hoặc Timeout).");
    }
};

let fixOcrText = async (text) => {
    if (!text || text.trim() === "") {
        return "";
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
        
        const prompt = `Bạn là một hệ thống AI chuyên tự động sửa lỗi nhận dạng ký tự quang học (OCR) cho văn bản tiếng Nhật.
Nhiệm vụ của bạn là nhận một đoạn văn bản tiếng Nhật bị lỗi OCR, phân tích ngữ cảnh, và trả về DUY NHẤT đoạn văn bản tiếng Nhật đã được sửa lỗi.

CÁC QUY TẮC NGHIÊM NGẶT (NẾU VI PHẠM SẼ LÀM HỎNG HỆ THỐNG):
1. TUYỆT ĐỐI CHỈ TRẢ VỀ CHUỖI TIẾNG NHẬT (Kanji, Hiragana, Katakana, và dấu câu tiếng Nhật).
2. KHÔNG BAO GIỜ bao gồm chữ Rōmaji (romaji), phiên âm, hay cách đọc trong ngoặc đơn.
3. KHÔNG BAO GIỜ bao gồm văn bản tiếng Việt hay bất kỳ lời giải thích, câu chào hỏi nào (như "Câu đã sửa là:").
4. GIỮ NGUYÊN các từ tiếng Anh (như AI, IT) hoặc chữ số nếu chúng có sẵn trong câu gốc.
5. Nếu câu gốc không có lỗi, hãy trả lại y nguyên câu đó.

Văn bản gốc (lỗi OCR):
${text}`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        
        // Post-processing: Loại bỏ các tiền tố giải thích thừa (nếu AI vẫn lỡ vi phạm)
        responseText = responseText.replace(/^(câu đã sửa|kết quả|sửa lỗi|văn bản|bản sửa)[^:]*:?\s*/i, "");
        responseText = responseText.replace(/^(đây là câu)[^:]*:?\s*/i, "");
        
        // Post-processing: Loại bỏ romaji nằm trong ngoặc đơn (nếu AI vẫn lỡ vi phạm)
        responseText = responseText.replace(/\([A-Za-z\s-]+\)/g, "");
        
        // Post-processing: Loại bỏ markdown (bold, italic)
        responseText = responseText.replace(/[*_]/g, "");
        
        return responseText.trim();
    } catch (error) {
        console.error("Gemini API Error in OCR Fix:", error);
        throw new Error("Không thể kết nối đến máy chủ AI (Lỗi mạng hoặc Timeout).");
    }
};

module.exports = {
    checkTextGrammar,
    fixOcrText
};
