import { Injectable } from '@angular/core';
import { buildReviewPrompt } from '../prompts/review-template';

export interface ReviewResult {
  raw: string;
  language: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
 setApiKey(key: string): void {
    // Vercel env variable use ho rahi hai
  }

  detectLanguage(text: string): string {
    const hindiChars = (text.match(/[\u0900-\u097F]/g) || []).length;
    const totalChars = text.replace(/\s/g, '').length || 1;
    const hindiRatio = hindiChars / totalChars;

    if (hindiRatio > 0.3) return 'Hinglish';
    return 'English';
  }

  async reviewArchitecture(
    question: string,
    description: string,
    graphJson: string
  ): Promise<ReviewResult> {

    const language = this.detectLanguage(
      question + ' ' + description
    );

    const prompt = buildReviewPrompt(
      question,
      description,
      graphJson,
      language
    );

    const response = await fetch('/api/review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      throw new Error('Failed to generate review');
    }

    const data = await response.json();

    return {
      raw: data.response,
      language
    };
  }
}