import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize with the provided API key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let checkTextGrammar = async (text) => {
    if (!text || text.trim() === "") {
        return [];
    }

    try {
        // Sử dụng model 'flash-lite' để cho tốc độ phản hồi nhanh nhất
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
        
        const prompt = `Bạn là một chuyên gia kiểm tra ngữ pháp tiếng Nhật. Hãy phân tích đoạn văn bản tiếng Nhật sau. 
Nếu không có lỗi, hãy trả về một mảng rỗng: []. 
Nếu có lỗi (ngữ pháp, dấu câu, cách diễn đạt thiếu tự nhiên, sai trợ từ), hãy trả về một mảng JSON chứa các object. 
Mỗi object bắt buộc phải có đúng các key sau: 
- "message": Lời giải thích rõ ràng về lỗi và cách sửa bằng tiếng Việt.
- "line": Số dòng chứa lỗi (bắt đầu từ 1).
- "column": Vị trí ký tự bị lỗi trên dòng (bắt đầu từ 1).
- "index": Vị trí ký tự trong toàn bộ văn bản (bắt đầu từ 0).

CHỈ TRẢ VỀ CHUỖI JSON ĐÚNG ĐỊNH DẠNG. KHÔNG thêm bất kỳ markdown nào như \`\`\`json hay text giải thích. Đảm bảo output có thể parse trực tiếp bằng JSON.parse.

Văn bản cần kiểm tra:
${text}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Loại bỏ markdown block nếu model vẫn trả về
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```json')) {
            cleanJson = cleanJson.replace(/```json/gi, '').replace(/```/g, '').trim();
        } else if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(cleanJson);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error("Gemini API Error in Grammar Check:", error);
        // Trả về mảng rỗng nếu có lỗi để không làm sập ứng dụng
        return [];
    }
};

module.exports = {
    checkTextGrammar
};
