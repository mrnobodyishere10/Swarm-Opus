// src/sidecars/ai-sidecar.ts
// Sidecar Pattern: AI analysis terpisah dari core scanner

import Anthropic from '@anthropic-ai/sdk';
import { configLoader } from '../control-plane/config-loader';
import { logger } from './logger-sidecar';

export interface BannerAnalysis {
  service: string;
  version: string;
  os: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  findings: string[];
  recommendations: string[];
}

class AISidecar {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY tidak ditemukan di .env');
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  async analyzeBanner(host: string, banner: string): Promise<BannerAnalysis | null> {
    const cfg = configLoader.get('ai-config.yaml');
    const systemPrompt = cfg.prompts.analyze_banner.system;

    try {
      const response = await this.getClient().messages.create({
        model: cfg.anthropic.model,
        max_tokens: cfg.anthropic.max_tokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Host: ${host}\nBanner:\n${banner}` }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean) as BannerAnalysis;

      logger.info('AI banner analysis done', { host, risk: result.risk });
      return result;
    } catch (err: any) {
      logger.error('AI analysis failed', { host, error: err.message });
      return null;
    }
  }
}

export const aiSidecar = new AISidecar();
