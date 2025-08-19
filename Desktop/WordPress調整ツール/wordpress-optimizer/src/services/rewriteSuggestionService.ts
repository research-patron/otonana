import type { 
  RewriteSuggestion, 
  QualityCheckResult,
  ImportedQualityReport,
  BeforeAfterContent,
  RewriteBatchOperation,
  SuggestionApprovalState,
  WordPressSite,
  GeminiResponse
} from '../types';
import { analyzeArticleQuality } from './gemini';
import { decryptApiKey } from '../utils/crypto';

export class RewriteSuggestionService {
  private static instance: RewriteSuggestionService;
  
  static getInstance(): RewriteSuggestionService {
    if (!RewriteSuggestionService.instance) {
      RewriteSuggestionService.instance = new RewriteSuggestionService();
    }
    return RewriteSuggestionService.instance;
  }

  async generateSuggestions(
    qualityResult: QualityCheckResult,
    site: WordPressSite,
    apiKey: string,
    progressCallback?: (progress: number) => void
  ): Promise<RewriteSuggestion> {
    const startTime = Date.now();
    
    try {
      progressCallback?.(10);
      
      // 記事内容を取得
      const postContent = await this.fetchPostContent(site, qualityResult.postId);
      
      progressCallback?.(30);
      
      // Gemini APIで具体的な修正提案を生成
      const suggestions = await this.generateDetailedSuggestions(
        postContent,
        qualityResult,
        apiKey
      );
      
      progressCallback?.(80);
      
      // RewriteSuggestion オブジェクトを構築
      const rewriteSuggestion: RewriteSuggestion = {
        id: `rewrite_${qualityResult.postId}_${Date.now()}`,
        postId: qualityResult.postId,
        postTitle: qualityResult.title,
        originalIssues: qualityResult.rewriteReasons,
        suggestions,
        generatedAt: new Date().toISOString(),
        generatedBy: 'gemini-2.5-flash',
        processingTime: Date.now() - startTime,
        tokensUsed: 0, // Gemini APIから取得する場合は後で更新
        approvalState: {
          overallStatus: 'pending',
          individualApprovals: {}
        }
      };
      
      // 各提案に対する初期承認状態を設定
      suggestions.forEach(suggestion => {
        rewriteSuggestion.approvalState.individualApprovals[suggestion.id] = {
          status: 'pending'
        };
      });
      
      progressCallback?.(100);
      
      return rewriteSuggestion;
    } catch (error) {
      console.error('Failed to generate rewrite suggestions:', error);
      throw error;
    }
  }

  async generateBatchSuggestions(
    qualityResults: QualityCheckResult[],
    site: WordPressSite,
    apiKey: string,
    progressCallback?: (progress: number, current: string) => void
  ): Promise<RewriteSuggestion[]> {
    const suggestions: RewriteSuggestion[] = [];
    const total = qualityResults.length;
    
    for (let i = 0; i < total; i++) {
      const result = qualityResults[i];
      const progress = Math.round((i / total) * 100);
      
      progressCallback?.(progress, result.title);
      
      try {
        const suggestion = await this.generateSuggestions(
          result,
          site,
          apiKey
        );
        suggestions.push(suggestion);
        
        // API rate limiting を考慮した遅延
        if (i < total - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Failed to generate suggestions for post ${result.postId}:`, error);
        // エラーが発生しても処理を継続
      }
    }
    
    progressCallback?.(100, '完了');
    
    return suggestions;
  }

  private async fetchPostContent(site: WordPressSite, postId: number): Promise<{
    title: string;
    content: string;
    metaDescription: string;
    excerpt?: string;
  }> {
    try {
      const response = await fetch(`${site.url}/wp-json/wp/v2/posts/${postId}`, {
        headers: {
          'Authorization': `Basic ${btoa(`${site.username}:${site.applicationPassword}`)}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch post: ${response.statusText}`);
      }
      
      const post = await response.json();
      
      return {
        title: post.title.rendered || '',
        content: post.content.rendered || '',
        metaDescription: post.meta?.description || post.excerpt?.rendered || '',
        excerpt: post.excerpt?.rendered
      };
    } catch (error) {
      console.error('Failed to fetch post content:', error);
      throw new Error('記事内容の取得に失敗しました');
    }
  }

  private async generateDetailedSuggestions(
    content: {
      title: string;
      content: string;
      metaDescription: string;
      excerpt?: string;
    },
    qualityResult: QualityCheckResult,
    apiKey: string
  ): Promise<RewriteSuggestion['suggestions']> {
    const prompt = this.buildSuggestionPrompt(content, qualityResult);
    
    try {
      const response = await this.callGeminiForSuggestions(prompt, apiKey);
      return this.parseSuggestionsResponse(response, content);
    } catch (error) {
      console.error('Failed to generate detailed suggestions:', error);
      throw error;
    }
  }

  private buildSuggestionPrompt(
    content: {
      title: string;
      content: string;
      metaDescription: string;
      excerpt?: string;
    },
    qualityResult: QualityCheckResult
  ): string {
    const issues = [
      ...qualityResult.rewriteReasons,
      ...qualityResult.geminiAnalysis.misinformationRisk.issues,
      ...qualityResult.geminiAnalysis.recencyCheck.outdatedInfo,
      ...qualityResult.geminiAnalysis.seoAnalysis.recommendations,
      ...qualityResult.geminiAnalysis.readabilityScore.suggestions
    ].filter(Boolean);

    return `
以下のWordPress記事について、具体的な修正提案を生成してください。

## 記事情報
タイトル: ${content.title}
メタディスクリプション: ${content.metaDescription}
記事内容: ${content.content.length > 3000 ? content.content.substring(0, 3000) + '...' : content.content}

## 検出された問題点
${issues.map(issue => `- ${issue}`).join('\n')}

## 品質スコア
- 総合スコア: ${qualityResult.overallScore}/100
- AI文章スコア: ${qualityResult.aiTextScore}/100
- 誤情報リスクスコア: ${qualityResult.misinformationScore}/100
- 古さスコア: ${qualityResult.ageScore}/100

## 出力要件
以下のJSON形式で具体的な修正提案を返してください：

{
  "suggestions": [
    {
      "id": "suggestion_1",
      "type": "title|content|meta_description|heading|paragraph|sentence",
      "originalText": "修正対象の元テキスト",
      "suggestedText": "修正後のテキスト",
      "reason": "修正理由の詳細説明",
      "priority": "high|medium|low",
      "position": {
        "start": 0,
        "end": 10,
        "selector": "h1, p:nth-child(2)等のセレクター"
      }
    }
  ]
}

## 修正提案のガイドライン
1. 具体的で実装可能な修正案を提示
2. SEOと読みやすさの両方を考慮
3. 元の記事の意図を保持しながら改善
4. 優先度を適切に設定（high: 重要な修正、medium: 推奨修正、low: 微細な改善）
5. 最大10個の修正提案まで
`;
  }

  private async callGeminiForSuggestions(prompt: string, apiKey: string): Promise<any> {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    
    const response = await fetch(`${url}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 10
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Invalid response format from Gemini API');
    }

    return data.candidates[0].content.parts[0].text;
  }

  private parseSuggestionsResponse(
    responseText: string,
    originalContent: {
      title: string;
      content: string;
      metaDescription: string;
      excerpt?: string;
    }
  ): RewriteSuggestion['suggestions'] {
    try {
      // レスポンスをクリーニング（マークダウンコードブロックを除去）
      let cleanedResponse = responseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('Invalid suggestions format');
      }

      return parsed.suggestions.map((suggestion: any, index: number) => ({
        id: suggestion.id || `suggestion_${index + 1}`,
        type: suggestion.type || 'content',
        originalText: suggestion.originalText || '',
        suggestedText: suggestion.suggestedText || '',
        reason: suggestion.reason || '',
        priority: suggestion.priority || 'medium',
        position: suggestion.position || undefined
      }));
    } catch (error) {
      console.error('Failed to parse suggestions response:', error);
      
      // パースに失敗した場合のフォールバック
      return this.createFallbackSuggestions(originalContent);
    }
  }

  private createFallbackSuggestions(content: {
    title: string;
    content: string;
    metaDescription: string;
    excerpt?: string;
  }): RewriteSuggestion['suggestions'] {
    const suggestions: RewriteSuggestion['suggestions'] = [];
    
    // タイトルの改善提案
    if (content.title.length > 60) {
      suggestions.push({
        id: 'fallback_title_1',
        type: 'title',
        originalText: content.title,
        suggestedText: content.title.substring(0, 57) + '...',
        reason: 'SEOに適したタイトル長に調整（60文字以内）',
        priority: 'medium'
      });
    }
    
    // メタディスクリプションの改善提案
    if (!content.metaDescription || content.metaDescription.length < 120) {
      suggestions.push({
        id: 'fallback_meta_1',
        type: 'meta_description',
        originalText: content.metaDescription || '',
        suggestedText: `${content.title}について詳しく解説。${content.content.substring(0, 80).replace(/<[^>]*>/g, '')}...`,
        reason: 'SEOに適したメタディスクリプションを追加（120-160文字）',
        priority: 'high'
      });
    }
    
    return suggestions;
  }

  async approveSuggestion(
    suggestionId: string,
    individualSuggestionId: string,
    status: 'approved' | 'rejected' | 'modified',
    modifiedText?: string
  ): Promise<void> {
    // この実装では、実際のストレージ（localStorage, IndexedDB等）への保存は省略
    // 実際の実装では適切なストレージシステムを使用する
    console.log(`Suggestion ${individualSuggestionId} in ${suggestionId} set to ${status}`);
    
    if (modifiedText) {
      console.log(`Modified text: ${modifiedText}`);
    }
  }

  async generateBeforeAfterContent(
    rewriteSuggestion: RewriteSuggestion,
    originalContent: {
      title: string;
      content: string;
      metaDescription: string;
      excerpt?: string;
    }
  ): Promise<BeforeAfterContent> {
    const approvedSuggestions = rewriteSuggestion.suggestions.filter(s => 
      rewriteSuggestion.approvalState.individualApprovals[s.id]?.status === 'approved'
    );
    
    const modifiedSuggestions = rewriteSuggestion.suggestions.filter(s =>
      rewriteSuggestion.approvalState.individualApprovals[s.id]?.status === 'modified'
    );
    
    // 修正提案を適用してコンテンツを生成
    let suggestedTitle = originalContent.title;
    let suggestedContent = originalContent.content;
    let suggestedMetaDescription = originalContent.metaDescription;
    
    // 承認された提案を適用
    [...approvedSuggestions, ...modifiedSuggestions].forEach(suggestion => {
      const approvalData = rewriteSuggestion.approvalState.individualApprovals[suggestion.id];
      const textToApply = approvalData?.modifiedText || suggestion.suggestedText;
      
      switch (suggestion.type) {
        case 'title':
          suggestedTitle = textToApply;
          break;
        case 'meta_description':
          suggestedMetaDescription = textToApply;
          break;
        case 'content':
        case 'paragraph':
        case 'sentence':
          if (suggestion.position && suggestion.originalText) {
            suggestedContent = suggestedContent.replace(
              suggestion.originalText,
              textToApply
            );
          }
          break;
      }
    });
    
    return {
      id: `before_after_${rewriteSuggestion.postId}_${Date.now()}`,
      postId: rewriteSuggestion.postId,
      original: originalContent,
      suggested: {
        title: suggestedTitle,
        content: suggestedContent,
        metaDescription: suggestedMetaDescription,
        excerpt: originalContent.excerpt
      },
      changes: {
        totalSuggestions: rewriteSuggestion.suggestions.length,
        approvedSuggestions: approvedSuggestions.length,
        rejectedSuggestions: rewriteSuggestion.suggestions.filter(s =>
          rewriteSuggestion.approvalState.individualApprovals[s.id]?.status === 'rejected'
        ).length,
        modifiedSuggestions: modifiedSuggestions.length,
        estimatedImprovementScore: this.calculateImprovementScore(rewriteSuggestion)
      }
    };
  }

  private calculateImprovementScore(rewriteSuggestion: RewriteSuggestion): number {
    const totalSuggestions = rewriteSuggestion.suggestions.length;
    if (totalSuggestions === 0) return 0;
    
    const approvedSuggestions = rewriteSuggestion.suggestions.filter(s =>
      ['approved', 'modified'].includes(
        rewriteSuggestion.approvalState.individualApprovals[s.id]?.status || 'pending'
      )
    );
    
    const highPriorityApproved = approvedSuggestions.filter(s => s.priority === 'high').length;
    const mediumPriorityApproved = approvedSuggestions.filter(s => s.priority === 'medium').length;
    const lowPriorityApproved = approvedSuggestions.filter(s => s.priority === 'low').length;
    
    // 重み付けスコア計算
    const score = (highPriorityApproved * 10) + (mediumPriorityApproved * 5) + (lowPriorityApproved * 2);
    const maxPossibleScore = rewriteSuggestion.suggestions.reduce((sum, s) => {
      switch (s.priority) {
        case 'high': return sum + 10;
        case 'medium': return sum + 5;
        case 'low': return sum + 2;
        default: return sum + 5;
      }
    }, 0);
    
    return maxPossibleScore > 0 ? Math.round((score / maxPossibleScore) * 100) : 0;
  }

  async exportFinalContent(beforeAfterContent: BeforeAfterContent[]): Promise<string> {
    // 最終的なコンテンツをCSV形式でエクスポート
    const headers = [
      '記事ID',
      'タイトル（修正前）',
      'タイトル（修正後）',
      'メタディスクリプション（修正前）',
      'メタディスクリプション（修正後）',
      '承認された提案数',
      '改善スコア'
    ];
    
    const csvRows = [headers.join(',')];
    
    beforeAfterContent.forEach(content => {
      const finalContent = content.final || content.suggested;
      
      const row = [
        content.postId.toString(),
        `"${content.original.title.replace(/"/g, '""')}"`,
        `"${finalContent.title.replace(/"/g, '""')}"`,
        `"${content.original.metaDescription.replace(/"/g, '""')}"`,
        `"${finalContent.metaDescription.replace(/"/g, '""')}"`,
        content.changes.approvedSuggestions.toString(),
        content.changes.estimatedImprovementScore.toString()
      ];
      
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  }
}

export const rewriteSuggestionService = RewriteSuggestionService.getInstance();