import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = Bun.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        } else {
            // console.warn("GEMINI_API_KEY not found in environment variables. AI features will be disabled.");
        }
    }

    async enhanceContent(content: string, context: string): Promise<string> {
        if (!this.genAI) {
            throw new Error("AI Service is not configured. Please add GEMINI_API_KEY to your environment.");
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });

            let extraInstructions = "";
            if (context.toLowerCase().includes("title") || context.toLowerCase().includes("h1")) {
                extraInstructions = "\n- Crucial constraint: Respond with ONLY ONE short sentence, MAXIMUM 5 words.";
            } else if (context.toLowerCase().includes("description")) {
                extraInstructions = "\n- Crucial constraint: Keep it professional and concise. MAXIMUM 20 words.";
            }

            const prompt = `
                You are a professional copywriter for Baitybites, a premium homemade food business.
                Refine the following content for a ${context}. 
                Make it professional and appetizing. Avoid generic cliches and redundant filler words.
                Use Indonesian as the primary language.
                ${extraInstructions}
                
                CONTENT TO ENHANCE:
                "${content}"
                
                Return ONLY the enhanced text without any greetings, explanations, or quotes.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error: any) {
            // console.error("Gemini AI error:", error);
            const msg = error.message || "Gagal memproses peningkatan AI.";
            throw new Error(`AI Error: ${msg}`);
        }
    }
}
