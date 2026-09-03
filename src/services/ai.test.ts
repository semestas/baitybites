import { describe, expect, it } from 'bun:test';
import { AIService } from './ai';

describe('AIService', () => {
  it('returns a usable fallback enhancement when Gemini is not configured', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const service = new AIService();
      const result = await service.enhanceContent('Nasi uduk', 'Product Description');

      expect(result).toBeString();
      expect(result.length).toBeGreaterThan(0);
      expect(result.toLowerCase()).toContain('nasi');
    } finally {
      if (originalKey) {
        process.env.GEMINI_API_KEY = originalKey;
      }
    }
  });

  it('creates product-specific fallback descriptions instead of one repeated sentence', () => {
    const service = new AIService() as any;
    service.genAI = null;

    const chocolate = service.buildFallbackContent('Brownies Cokelat', 'Product Description');
    const spicy = service.buildFallbackContent('Sambal Pedas', 'Product Description');

    expect(chocolate).not.toBe(spicy);
    expect(chocolate.toLowerCase()).toContain('cokelat');
    expect(spicy.toLowerCase()).toContain('pedas');
  });
});
