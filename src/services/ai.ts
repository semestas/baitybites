import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {
    private genAI: GoogleGenerativeAI | null = null;

    constructor() {
        const apiKey = Bun.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
        }
    }

    private buildFallbackContent(content: string, context: string): string {
        const trimmed = content.trim();
        if (!trimmed) return context;

        const base = trimmed.replace(/\s+/g, ' ');
        const lowerContext = context.toLowerCase();

        if (lowerContext.includes('title') || lowerContext.includes('h1')) {
            return base.length > 40 ? `${base.substring(0, 37).trim()}...` : base;
        }

        if (lowerContext.includes('description')) {
            const lowerContent = base.toLowerCase();
            const descriptors = lowerContent.includes('cokelat') || lowerContent.includes('chocolate')
                ? 'dengan rasa cokelat yang lembut dan pas untuk teman santai'
                : lowerContent.includes('pedas') || lowerContent.includes('sambal')
                    ? 'dengan sentuhan pedas yang terasa dan tetap nyaman dinikmati'
                    : lowerContent.includes('keju') || lowerContent.includes('cheese')
                        ? 'dengan gurih keju yang hangat dan cocok dinikmati kapan saja'
                        : lowerContent.includes('madu') || lowerContent.includes('honey')
                            ? 'dengan manis alami yang ringan dan aroma yang menyenangkan'
                            : 'dengan rasa homemade yang hangat dan bahan yang dipilih dengan baik';

            return `${base} — ${descriptors}.`.slice(0, 180).trim();
        }

        return `${base} dengan cita rasa yang konsisten, fresh, dan siap dinikmati.`;
    }

    async enhanceContent(content: string, context: string): Promise<string> {
        if (!this.genAI) {
            return this.buildFallbackContent(content, context);
        }

        try {
            let extraInstructions = "";
            if (context.toLowerCase().includes("title") || context.toLowerCase().includes("h1")) {
                extraInstructions = "\n- Crucial constraint: Respond with ONLY ONE short sentence, MAXIMUM 5 words.";
            } else if (context.toLowerCase().includes("description")) {
                extraInstructions = "\n- Crucial constraint: Keep it professional and concise. MAXIMUM 20 words.";
            }

            const prompt = `
                You are a natural, warm copywriter for Baitybites, a homemade food brand.
                Refine the following content for a ${context}.
                Keep the tone casual, genuine, and relatable, like a good Instagram caption or product description from a small food brand.
                Avoid exaggerated hype, fake luxury language, fake claims, and generic AI-sounding phrases.
                Use Indonesian naturally and conversationally.
                Make it sound honest, appetizing, and easy to understand.
                Do not use empty filler words like "premium banget", "super duper", "bikin nagih" unless it is truly natural.
                ${extraInstructions}

                CONTENT TO ENHANCE:
                "${content}"

                Return ONLY the enhanced text without any greetings, explanations, or quotes.
            `;

            const configuredModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
            const modelNames = [...new Set([configuredModel, 'gemini-2.5-flash', 'gemini-2.0-flash'])];
            let lastError: unknown;

            for (const modelName of modelNames) {
                try {
                    const model = this.genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const enhanced = response.text().trim().replace(/^['"]|['"]$/g, '');
                    if (enhanced) return enhanced;
                } catch (error) {
                    lastError = error;
                    console.warn(`[AIService] Gemini model ${modelName} failed; trying next model.`);
                }
            }

            throw lastError || new Error('Gemini returned an empty response');
        } catch (error: any) {
            console.warn(`[AIService] Gemini enhancement failed; using fallback: ${error?.message || error}`);
            return this.buildFallbackContent(content, context);
        }
    }
}
