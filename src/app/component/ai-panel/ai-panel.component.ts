import { Component, computed, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GraphService } from '../../services/graph.service';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-panel.component.html',
  styleUrls: ['./ai-panel.component.scss'],
})
export class AiPanelComponent implements OnDestroy {
  private graphService = inject(GraphService);
  private aiService = inject(AiService);

  question = '';
  description = '';
  apiKey = '';
  result = '';
  loading = false;
  error = '';
  isRecordingQuestion = false;
  isRecordingDesc = false;
  detectedLang = '';

  private recognitionQ: any = null;
  private recognitionD: any = null;

  readonly nodeCount = computed(() => {
    this.graphService.graphUpdated();
    return this.graphService.exportGraph().nodes.length;
  });

  readonly edgeCount = computed(() => {
    this.graphService.graphUpdated();
    return this.graphService.exportGraph().edges.length;
  });

  toggleMic(field: 'question' | 'description'): void {
    if (field === 'question') {
      this.isRecordingQuestion ? this.stopRecording('question') : this.startRecording('question');
    } else {
      this.isRecordingDesc ? this.stopRecording('description') : this.startRecording('description');
    }
  }

  private startRecording(field: 'question' | 'description'): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { this.error = 'Speech recognition not supported in this browser.'; return; }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (field === 'question') this.question = transcript;
      else this.description = transcript;
    };
    rec.onerror = () => { if (field === 'question') this.isRecordingQuestion = false; else this.isRecordingDesc = false; };
    rec.onend   = () => { if (field === 'question') this.isRecordingQuestion = false; else this.isRecordingDesc = false; };
    rec.start();

    if (field === 'question') { this.recognitionQ = rec; this.isRecordingQuestion = true; }
    else { this.recognitionD = rec; this.isRecordingDesc = true; }
  }

  private stopRecording(field?: 'question' | 'description'): void {
    if (!field || field === 'question') { this.recognitionQ?.stop(); this.isRecordingQuestion = false; }
    if (!field || field === 'description') { this.recognitionD?.stop(); this.isRecordingDesc = false; }
  }

  async analyze(): Promise<void> {
    if (!this.question.trim()) {
      this.error = 'Question likhna zaroori hai — kya design kar rahe ho?';
      return;
    }
    if (!this.description.trim()) {
      this.error = 'Description bhi chahiye — apna approach explain karo.';
      return;
    }

    if (this.apiKey.trim()) {
      this.aiService.setApiKey(this.apiKey.trim());
    }

    this.loading = true;
    this.error = '';
    this.result = '';

    try {
      const graph = this.graphService.exportGraph();
      const graphJson = JSON.stringify(graph, null, 2);
      const res = await this.aiService.reviewArchitecture(
        this.question, this.description, graphJson
      );
      this.result = res.raw;
      this.detectedLang = res.language;
    } catch (err: any) {
      this.error = err?.message ?? 'AI review failed. API key check karo.';
    } finally {
      this.loading = false;
    }
  }

  get resultSections(): { heading: string; body: string; type: string }[] {
    if (!this.result) return [];
    const sections: { heading: string; body: string; type: string }[] = [];
    const parts = this.result.split(/\n(?=## )/);
    for (const part of parts) {
      const lines = part.trim().split('\n');
      const heading = lines[0].replace(/^##\s*/, '').trim();
      const body = lines.slice(1).join('\n').trim();
      if (!heading) continue;
      let type = 'default';
      if (heading.includes('Overall') || heading.includes('🎯'))      type = 'score';
      else if (heading.includes('Correctly') || heading.includes('✅')) type = 'good';
      else if (heading.includes('Mistakes') || heading.includes('❌'))  type = 'bad';
      else if (heading.includes('Wording') || heading.includes('💬'))   type = 'pro';
      else if (heading.includes('Ideal') || heading.includes('📋'))     type = 'structure';
      else if (heading.includes('Observations') || heading.includes('⚠️')) type = 'warn';
      else if (heading.includes('Polished') || heading.includes('🏆'))  type = 'final';
      else if (heading.includes('Tips') || heading.includes('💡'))      type = 'tip';
      sections.push({ heading, body, type });
    }
    return sections;
  }

  ngOnDestroy(): void {
    this.stopRecording();
  }
}
