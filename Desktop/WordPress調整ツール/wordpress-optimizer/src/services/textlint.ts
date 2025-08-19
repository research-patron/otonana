import type { TextlintResult, QualityCheckConfig } from '../types';

interface TextLintEngine {
  executeOnText(text: string, filePath?: string): Promise<TextlintResult[]>;
}

// TextLint エンジンの動的インポート（ブラウザ環境での制限対応）
class TextLintService {
  private engine: TextLintEngine | null = null;
  private isInitialized = false;

  private async initializeEngine(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // ブラウザ環境でのtextlint実行は制限があるため、
      // 代替として独自の簡易AI文章検出を実装
      this.engine = {
        executeOnText: this.executeSimpleAIDetection.bind(this)
      };
      this.isInitialized = true;
    } catch (error) {
      console.warn('TextLint初期化に失敗しました。代替手段を使用します:', error);
      this.engine = {
        executeOnText: this.executeSimpleAIDetection.bind(this)
      };
      this.isInitialized = true;
    }
  }

  // 簡易AI文章検出（textlint-rule-preset-ai-writingの代替）
  private async executeSimpleAIDetection(text: string, filePath?: string): Promise<TextlintResult[]> {
    const messages: TextlintResult['messages'] = [];
    const lines = text.split('\n');

    // AI特有のパターンを検出
    const aiPatterns = [
      {
        pattern: /重要なポイントは以下の通りです/gi,
        message: 'AI特有の導入フレーズが検出されました',
        ruleId: 'ai-intro-phrase'
      },
      {
        pattern: /以下にまとめました/gi,
        message: 'AI特有のまとめフレーズが検出されました',
        ruleId: 'ai-summary-phrase'
      },
      {
        pattern: /それでは、詳しく見ていきましょう/gi,
        message: 'AI特有の展開フレーズが検出されました',
        ruleId: 'ai-transition-phrase'
      },
      {
        pattern: /〜について説明します/gi,
        message: 'AI特有の説明導入フレーズが検出されました',
        ruleId: 'ai-explanation-intro'
      },
      {
        pattern: /いかがでしたでしょうか/gi,
        message: 'AI特有の結語フレーズが検出されました',
        ruleId: 'ai-closing-phrase'
      }
    ];

    // 箇条書きの過剰使用をチェック
    const bulletPointPattern = /^\s*[・・•\-\*]\s/gm;
    const bulletMatches = text.match(bulletPointPattern) || [];
    const totalLines = lines.filter(line => line.trim().length > 0).length;
    const bulletRatio = bulletMatches.length / Math.max(totalLines, 1);

    if (bulletRatio > 0.4) { // 40%以上が箇条書き
      messages.push({
        ruleId: 'excessive-bullet-points',
        severity: 2,
        message: `箇条書きの使用率が高すぎます (${Math.round(bulletRatio * 100)}%)`,
        line: 1,
        column: 1,
        type: 'lint'
      });
    }

    // AI特有のパターンをチェック
    lines.forEach((line, lineIndex) => {
      aiPatterns.forEach(({ pattern, message, ruleId }) => {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const column = line.indexOf(match) + 1;
            messages.push({
              ruleId,
              severity: 2,
              message,
              line: lineIndex + 1,
              column,
              type: 'lint'
            });
          });
        }
      });

      // 長すぎる文章をチェック（読みやすさの観点）
      const sentencePattern = /[。！？]/g;
      const sentences = line.split(sentencePattern).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        if (sentence.length > 100) {
          const column = line.indexOf(sentence) + 1;
          messages.push({
            ruleId: 'long-sentence',
            severity: 1,
            message: `文章が長すぎます (${sentence.length}文字)。読みやすさのため分割を検討してください`,
            line: lineIndex + 1,
            column,
            type: 'lint'
          });
        }
      });
    });

    // 敬語の不統一をチェック
    const casualPattern = /だ。|である。|だよね|だからね/g;
    const politePattern = /です。|ます。|でしょう。|いたします/g;
    
    const casualMatches = text.match(casualPattern) || [];
    const politeMatches = text.match(politePattern) || [];
    
    if (casualMatches.length > 0 && politeMatches.length > 0) {
      const ratio = casualMatches.length / (casualMatches.length + politeMatches.length);
      if (ratio > 0.1 && ratio < 0.9) { // 混在している場合
        messages.push({
          ruleId: 'inconsistent-tone',
          severity: 1,
          message: '敬語と常体が混在しています。文体の統一を検討してください',
          line: 1,
          column: 1,
          type: 'lint'
        });
      }
    }

    // 同じ語彙の繰り返しをチェック
    const words = text.match(/\b[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,}\b/g) || [];
    const wordCounts: Record<string, number> = {};
    
    words.forEach(word => {
      if (word.length >= 3) { // 3文字以上の単語のみ
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });

    Object.entries(wordCounts).forEach(([word, count]) => {
      if (count > 5) { // 5回以上の繰り返し
        messages.push({
          ruleId: 'word-repetition',
          severity: 1,
          message: `「${word}」が${count}回使用されています。類語の使用を検討してください`,
          line: 1,
          column: 1,
          type: 'lint'
        });
      }
    });

    return [{
      messages,
      filePath,
      output: text
    }];
  }

  // 記事の品質チェック実行
  async checkArticleQuality(
    content: string, 
    config: QualityCheckConfig,
    filePath?: string
  ): Promise<TextlintResult> {
    await this.initializeEngine();

    if (!this.engine) {
      throw new Error('TextLintエンジンの初期化に失敗しました');
    }

    try {
      // HTMLタグを除去してプレーンテキストに変換
      const plainText = this.stripHtmlTags(content);
      
      // TextLint実行
      const results = await this.engine.executeOnText(plainText, filePath);
      
      // 設定に基づいてフィルタリング
      const filteredResult = this.filterResults(results[0] || { messages: [] }, config);
      
      return filteredResult;
    } catch (error) {
      console.error('TextLint実行エラー:', error);
      
      // エラー時はエラー情報を含む結果を返す
      return {
        messages: [{
          ruleId: 'textlint-error',
          severity: 2,
          message: `品質チェック中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
          line: 1,
          column: 1,
          type: 'parse'
        }],
        filePath,
        output: content
      };
    }
  }

  // HTMLタグを除去
  private stripHtmlTags(html: string): string {
    // HTMLエンティティをデコード
    const htmlDecoded = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // HTMLタグを除去
    const withoutTags = htmlDecoded.replace(/<[^>]*>/g, ' ');
    
    // 複数の空白を単一の空白に変換
    const normalized = withoutTags.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  // 設定に基づいて結果をフィルタリング
  private filterResults(result: TextlintResult, config: QualityCheckConfig): TextlintResult {
    const filteredMessages = result.messages.filter(message => {
      // 設定で無効化されているルールを除外
      if (!config.textlintRules.aiWritingDetection && 
          message.ruleId.startsWith('ai-')) {
        return false;
      }
      
      if (!config.textlintRules.excessiveBulletPoints && 
          message.ruleId === 'excessive-bullet-points') {
        return false;
      }
      
      if (!config.textlintRules.aiPhrasePatterns && 
          ['ai-intro-phrase', 'ai-summary-phrase', 'ai-transition-phrase'].includes(message.ruleId)) {
        return false;
      }
      
      return true;
    });

    return {
      ...result,
      messages: filteredMessages
    };
  }

  // AI文章スコアを計算（0-100）
  calculateAITextScore(result: TextlintResult): number {
    const { messages } = result;
    
    // 重み付けスコア計算
    let score = 100;
    
    messages.forEach(message => {
      let penalty = 0;
      
      switch (message.ruleId) {
        case 'ai-intro-phrase':
        case 'ai-summary-phrase':
        case 'ai-transition-phrase':
        case 'ai-explanation-intro':
        case 'ai-closing-phrase':
          penalty = 15; // AI特有フレーズは重いペナルティ
          break;
        case 'excessive-bullet-points':
          penalty = 20; // 箇条書き過多は重いペナルティ
          break;
        case 'inconsistent-tone':
          penalty = 10;
          break;
        case 'word-repetition':
          penalty = 5;
          break;
        case 'long-sentence':
          penalty = 3;
          break;
        default:
          penalty = 5;
      }
      
      // 重要度（severity）による調整
      penalty = penalty * (message.severity / 2);
      
      score -= penalty;
    });
    
    return Math.max(0, Math.min(100, score));
  }

  // エラー種別の統計を取得
  getErrorStatistics(result: TextlintResult): Record<string, number> {
    const stats: Record<string, number> = {};
    
    result.messages.forEach(message => {
      stats[message.ruleId] = (stats[message.ruleId] || 0) + 1;
    });
    
    return stats;
  }
}

// シングルトンインスタンス
const textlintService = new TextLintService();

export default textlintService;
export { TextLintService };