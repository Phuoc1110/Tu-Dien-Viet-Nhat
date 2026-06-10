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
Nhiệm vụ của bạn là nhận một đoạn văn bản tiếng Nhật được trích xuất từ ảnh (có thể chứa nhiều lỗi sai chữ Hán do máy nhận diện nhầm nét).
Hãy phân tích ngữ cảnh, đoán xem từ gốc thực sự là gì, và trả về DUY NHẤT một đoạn văn bản tiếng Nhật đã được sửa lỗi hoàn chỉnh.

TUYỆT ĐỐI KHÔNG giải thích, KHÔNG thêm câu chào hỏi, KHÔNG sử dụng ký tự markdown. CHỈ TRẢ VỀ CÂU ĐÃ SỬA.

Văn bản gốc (lỗi OCR):
${text}`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Gemini API Error in OCR Fix:", error);
        throw new Error("Không thể kết nối đến máy chủ AI (Lỗi mạng hoặc Timeout).");
    }
};

module.exports = {
    checkTextGrammar,
    fixOcrText
};
