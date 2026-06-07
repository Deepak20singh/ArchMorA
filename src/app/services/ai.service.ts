import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../environments/environments';
import { buildReviewPrompt } from '../prompts/review-template';

export interface ReviewResult {
  raw: string;
  language: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {

  private apiKey = environment.geminiApiKey;

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  detectLanguage(text: string): string {
    const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length || 1;
    const hindiRatio = hindiChars / totalChars;

    // Pure Hindi script detected
    if (hindiRatio > 0.3) return 'Hinglish';  // Hindi bola = Hinglish mein jawab
    // English only
    return 'English';
  }

  async reviewArchitecture(
    question: string,
    description: string,
    graphJson: string
  ): Promise<ReviewResult> {
    const language = this.detectLanguage(question + ' ' + description);
    const prompt = buildReviewPrompt(question, description, graphJson, language);

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    return { raw, language };
  }
}
