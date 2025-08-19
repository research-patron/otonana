import type { 
  GeminiRequest, 
  GeminiResponse, 
  AISuggestion, 
  StructuredAIResponse,
  APIError,
  PromptTemplate,
  SiteAnalysis,
  WordPressCategory,
  WordPressTag,
  GeminiQualityAnalysis
} from '../types';

// Gemini API 設定
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.5-pro';

// リクエスト制限
const RATE_LIMITS = {
  'gemini-2.5-pro': { rpm: 2, tpm: 32000 },
  'gemini-2.5-flash': { rpm: 15, tpm: 1000000 },
};

// コスト計算（概算、実際のコストはGoogle AIの料金体系に依存）
const COST_PER_1K_TOKENS = {
  'gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
};

class GeminiAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any,
    public status?: number
  ) {
    super(message);
    this.name = 'GeminiAPIError';
  }
}

// レート制限管理
class RateLimiter {
  private requests: { [model: string]: number[] } = {};
  private tokens: { [model: string]: number[] } = {};

  canMakeRequest(model: string, estimatedTokens: number = 1000): boolean {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // 1分以内のリクエスト数をカウント
    if (!this.requests[model]) this.requests[model] = [];
    this.requests[model] = this.requests[model].filter(time => now - time < oneMinute);
    
    // 1分以内のトークン数をカウント
    if (!this.tokens[model]) this.tokens[model] = [];
    this.tokens[model] = this.tokens[model].filter(time => now - time < oneMinute);

    const limits = RATE_LIMITS[model as keyof typeof RATE_LIMITS];
    if (!limits) return false;

    return (
      this.requests[model].length < limits.rpm &&
      this.tokens[model].reduce((sum, tokens) => sum + tokens, 0) + estimatedTokens < limits.tpm
    );
  }

  recordRequest(model: string, tokens: number): void {
    const now = Date.now();
    if (!this.requests[model]) this.requests[model] = [];
    if (!this.tokens[model]) this.tokens[model] = [];
    
    this.requests[model].push(now);
    this.tokens[model].push(tokens);
  }
}

const rateLimiter = new RateLimiter();

// 構造化レスポンス用のJSON Schema
const STRUCTURED_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "記事のタイトル（32文字以内推奨）"
    },
    meta_description: {
      type: "string", 
      description: "メタディスクリプション（120-160文字）"
    },
    categories: {
      type: "array",
      items: { type: "string" },
      description: "推奨カテゴリーの配列"
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "推奨タグの配列（5個以内）"
    },
    text: {
      type: "string",
      description: "記事本文（markdown形式）"
    },
    seo_keywords: {
      type: "array",
      items: { type: "string" },
      description: "SEOキーワード（オプション）"
    }
  },
  required: ["title", "meta_description", "categories", "tags", "text"]
};

// 構造化レスポンスをAISuggestion形式に変換
const convertStructuredToAISuggestion = (structuredResponse: StructuredAIResponse): AISuggestion => {
  console.log('Converting structured response to AISuggestion:', structuredResponse);
  
  // 見出し構造の抽出（textフィールドから）
  const headings: Array<{ level: number; text: string; description: string }> = [];
  const headingMatches = structuredResponse.text.match(/^(#{1,6})\s+(.+)$/gm);
  
  if (headingMatches) {
    headingMatches.forEach(match => {
      const levelMatch = match.match(/^(#{1,6})\s+(.+)$/);
      if (levelMatch) {
        const level = levelMatch[1].length;
        const text = levelMatch[2].trim();
        headings.push({
          level,
          text,
          description: `${text}に関する詳細な解説`
        });
      }
    });
  }
  
  // 記事構造の分析
  const sections = structuredResponse.text.split(/^#{1,6}\s+/m);
  const introduction = sections[0] ? sections[0].trim().substring(0, 300) : '';
  const conclusion = sections.length > 1 ? sections[sections.length - 1].trim().substring(-200) : '';
  
  const suggestion: AISuggestion = {
    titles: [structuredResponse.title],
    categories: {
      existing: [],
      new: structuredResponse.categories
    },
    tags: {
      existing: [],
      new: structuredResponse.tags
    },
    structure: {
      headings
    },
    metaDescriptions: [structuredResponse.meta_description],
    fullArticle: {
      introduction,
      mainContent: structuredResponse.text,
      conclusion
    },
    structuredResponse // 元の構造化レスポンスも保持
  };
  
  console.log('Converted to AISuggestion:', {
    titlesCount: suggestion.titles.length,
    categoriesCount: suggestion.categories.new.length,
    tagsCount: suggestion.tags.new.length,
    headingsCount: suggestion.structure.headings.length,
    hasStructuredResponse: !!suggestion.structuredResponse
  });
  
  return suggestion;
};

// マークダウン記事をAISuggestion形式にパースする関数
const parseMarkdownArticle = (text: string): AISuggestion => {
  console.log('Parsing markdown article response:', text.substring(0, 500) + '...');
  
  try {
    // タイトルの抽出 (# で始まる行)
    const titleMatch = text.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '生成された記事';
    
    // メタディスクリプションの抽出
    const metaMatch = text.match(/\*\*メタディスクリプション:\*\*\s*(.+?)(?:\n|$)/);
    const metaDescription = metaMatch ? metaMatch[1].trim() : '';
    
    // カテゴリーの抽出
    const categoryMatch = text.match(/\*\*推奨カテゴリー:\*\*\s*(.+?)(?:\n|$)/);
    const categoryNames = categoryMatch 
      ? categoryMatch[1].split(',').map(c => c.trim().replace(/[\[\]]/g, ''))
      : [];
    
    // タグの抽出
    const tagMatch = text.match(/\*\*推奨タグ:\*\*\s*(.+?)(?:\n|$)/);
    const tagNames = tagMatch 
      ? tagMatch[1].split(',').map(t => t.trim().replace(/[\[\]]/g, ''))
      : [];
    
    // 記事本文の抽出（--- より後の部分）
    const contentMatch = text.match(/---\s*\n([\s\S]*)/);
    const fullContent = contentMatch ? contentMatch[1].trim() : text;
    
    // 見出し構造の抽出
    const headings: Array<{ level: number; text: string; description: string }> = [];
    const headingMatches = fullContent.match(/^(#{2,6})\s+(.+)$/gm);
    
    if (headingMatches) {
      headingMatches.forEach(match => {
        const levelMatch = match.match(/^(#{2,6})\s+(.+)$/);
        if (levelMatch) {
          const level = levelMatch[1].length;
          const text = levelMatch[2].trim();
          headings.push({
            level,
            text,
            description: `${text}に関する詳細な解説`
          });
        }
      });
    }
    
    // フルアーティクルの構造化
    const sections = fullContent.split(/^#{2,6}\s+/m);
    const introduction = sections[0] ? sections[0].trim().substring(0, 300) : '';
    const mainContent = fullContent;
    const conclusion = sections.length > 1 ? sections[sections.length - 1].trim().substring(-200) : '';
    
    const suggestion: AISuggestion = {
      titles: [title],
      categories: {
        existing: [],
        new: categoryNames.filter(name => name.length > 0)
      },
      tags: {
        existing: [],
        new: tagNames.filter(name => name.length > 0)
      },
      structure: {
        headings
      },
      metaDescriptions: metaDescription ? [metaDescription] : [],
      fullArticle: {
        introduction,
        mainContent,
        conclusion
      }
    };
    
    console.log('Successfully parsed markdown article:', {
      title,
      metaDescription: metaDescription.substring(0, 50) + '...',
      categoriesCount: categoryNames.length,
      tagsCount: tagNames.length,
      headingsCount: headings.length,
      contentLength: fullContent.length
    });
    
    return suggestion;
    
  } catch (error) {
    console.error('Error parsing markdown article:', error);
    
    // フォールバック: 最低限の構造を返す
    return {
      titles: ['エラー: 記事の解析に失敗しました'],
      categories: { existing: [], new: [] },
      tags: { existing: [], new: [] },
      structure: { headings: [] },
      metaDescriptions: ['記事の解析に失敗しました。'],
      fullArticle: {
        introduction: '',
        mainContent: text, // 生のテキストをそのまま使用
        conclusion: ''
      }
    };
  }
};

// プロンプトテンプレート
const SYSTEM_PROMPTS = {
  analyze: `あなたは経験豊富なSEO専門家兼コンテンツライターです。
提供された情報を基に、WordPress記事の最適化提案を行ってください。

以下の要素を考慮してください：
- SEO効果的なタイトル作成
- 適切なカテゴリー・タグ選択
- 読みやすい記事構成
- メタディスクリプション最適化
- ターゲット読者層への訴求

回答は必ずJSON形式で返してください。`,

  title: `SEO効果的な記事タイトルを3-5個生成してください。
条件：
- 32文字以内（日本語）
- 検索されやすいキーワードを含む
- クリックしたくなる魅力的な表現
- 読者の悩みや興味を引く内容`,

  structure: `記事の構成案を作成してください。
以下の形式で提案してください：
- H2見出し（3-5個）
- 各見出しの詳細説明
- 推奨文字数
- 含めるべき要素`,

  meta: `検索結果に表示されるメタディスクリプションを作成してください。
条件：
- 120-160文字以内
- 主要キーワードを含む
- ユーザーのクリック意欲を促す
- 記事の内容を適切に要約`,
};

// APIリクエスト実行
const makeGeminiRequest = async (
  apiKey: string,
  model: string,
  prompt: string,
  options: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    isConnectionTest?: boolean;
    responseSchema?: any; // JSON Schema for structured response
    useStructuredResponse?: boolean; // 構造化レスポンスを使用するかどうか
  } = {}
): Promise<GeminiResponse> => {
  try {
    const {
      temperature = 0.7,
      maxOutputTokens = 8192,
      topP = 0.8,
      topK = 40,
      isConnectionTest = false,
      responseSchema,
      useStructuredResponse = false,
    } = options;

    // リクエストボディを構築
    const requestBody: any = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens,
        topP,
        topK,
      },
    };

    // 構造化レスポンスの場合はresponseSchemaを追加
    if (useStructuredResponse && responseSchema) {
      requestBody.generationConfig.responseSchema = responseSchema;
      requestBody.generationConfig.responseMimeType = "application/json";
      console.log('Using structured response with schema:', responseSchema);
    }

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      let details;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        details = errorData;
      } catch {
        // JSON parsing failed
      }

      throw new GeminiAPIError(
        `HTTP_${response.status}`,
        errorMessage,
        details,
        response.status
      );
    }

    const data = await response.json();
    console.log('Gemini API Response:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in response:', data);
      throw new GeminiAPIError(
        'NO_CANDIDATES',
        'APIから候補が返されませんでした'
      );
    }

    const candidate = data.candidates[0];
    const content = candidate.content?.parts?.[0]?.text;
    
    // MAX_TOKENSの場合の処理を分岐
    if (!content) {
      if (candidate.finishReason === 'MAX_TOKENS') {
        if (isConnectionTest) {
          console.log('Response truncated due to MAX_TOKENS, but connection is successful');
          return {
            text: '接続成功（レスポンスが短縮されました）',
            tokensUsed: data.usageMetadata?.totalTokenCount || 0,
            model,
            timestamp: new Date().toISOString(),
          };
        } else {
          // AI提案生成でMAX_TOKENSの場合は専用エラーを投げる
          console.log('Response truncated due to MAX_TOKENS for AI suggestions');
          throw new GeminiAPIError(
            'MAX_TOKENS',
            'レスポンスが制限に達しました。プロンプトを短縮して再試行してください。',
            { finishReason: candidate.finishReason, usageMetadata: data.usageMetadata }
          );
        }
      }
      
      console.error('No content in candidate:', candidate);
      throw new GeminiAPIError(
        'NO_CONTENT',
        'APIからコンテンツが返されませんでした'
      );
    }

    // トークン数の概算（実際の計算は複雑）
    const estimatedTokens = Math.ceil((prompt.length + content.length) / 4);
    
    // レート制限記録
    rateLimiter.recordRequest(model, estimatedTokens);

    return {
      text: content,
      tokensUsed: estimatedTokens,
      model,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    if (error instanceof GeminiAPIError) {
      throw error;
    }

    if (error instanceof TypeError) {
      throw new GeminiAPIError(
        'NETWORK_ERROR',
        'ネットワークエラーが発生しました',
        error
      );
    }

    throw new GeminiAPIError(
      'UNKNOWN_ERROR',
      '予期しないエラーが発生しました',
      error
    );
  }
};

// APIキーの検証
export const validateGeminiApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    
    // 簡単なリクエストでAPIキーを検証
    await makeGeminiRequest(
      apiKey,
      'gemini-2.5-flash', // 高速・低コストモデルでテスト
      'テスト',
      { maxOutputTokens: 10, isConnectionTest: true }
    );
    
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
};

// 構造化レスポンス用の記事生成（新機能）
export const generateArticleSuggestionsStructured = async (
  apiKey: string,
  model: string,
  input: string,
  siteAnalysis?: SiteAnalysis,
  template?: PromptTemplate,
  fileContent?: {
    text: string;
    headings: Array<{ level: number; text: string }>;
    keywords: string[];
    structure: string;
  }
): Promise<AISuggestion> => {
  try {
    // レート制限チェック
    if (!rateLimiter.canMakeRequest(model, 3000)) {
      throw new GeminiAPIError(
        'RATE_LIMIT',
        'レート制限に達しました。しばらく待ってから再試行してください。'
      );
    }

    // コンテキスト情報の構築
    let context = '';
    if (siteAnalysis) {
      context += `\n\nサイト情報：
- よく使われるキーワード: ${siteAnalysis.commonKeywords.slice(0, 8).join(', ')}
- 平均記事文字数: ${siteAnalysis.averagePostLength}文字
- 既存カテゴリー: ${siteAnalysis.categories.map(c => c.name).slice(0, 5).join(', ')}`;
    }

    // ファイル内容情報の追加
    if (fileContent) {
      context += `\n\nアップロードファイル情報：
- 抽出キーワード: ${fileContent.keywords.slice(0, 5).join(', ')}
- 見出し数: ${fileContent.headings.length}`;
    }

    // プロンプトテンプレートの適用
    let systemPrompt = template?.system || SYSTEM_PROMPTS.analyze;
    if (template) {
      systemPrompt = `${template.system}

書き方のトーン: ${template.tone}
ターゲット読者: ${template.targetAudience}
SEO重視度: ${template.seoFocus}/10
記事の目的: ${template.purpose}`;
    }

    // 入力内容の構築
    let inputContent = input;
    if (fileContent && fileContent.text) {
      inputContent = `${input}

【参考ファイル内容】
${fileContent.text.substring(0, 1500)}${fileContent.text.length > 1500 ? '...(省略)' : ''}`;
    }

    // 現在の記事状態の検出
    const hasCurrentState = input.includes('現在の記事状態:') || input.includes('追加指示・修正要求:');
    
    if (hasCurrentState) {
      console.log('Detected article improvement request with current state context');
    }

    const fullPrompt = `${systemPrompt}${context}

【依頼内容】
${inputContent}

【重要な指示】
${hasCurrentState ? 
  '- 現在の記事状態を踏まえて、指定された修正・改善要求に対応してください\n- 既存の内容を活かしつつ、より良い記事に改善してください' : 
  '- 提供された情報を基に、SEOに最適化された高品質な記事を作成してください'
}

【出力要求】
以下のJSON形式で構造化された記事データを作成してください：

- title: 魅力的で検索に最適化された記事タイトル（32文字以内推奨）
- meta_description: SEO効果的なメタディスクリプション（120-160文字）
- categories: 適切なカテゴリー名の配列（2-3個）
- tags: 関連性の高いタグの配列（3-5個）
- text: 完全な記事本文（markdown形式、適切な見出し構造を含む）

記事は読みやすく、情報価値が高く、SEOに最適化された内容にしてください。`;

    // 構造化レスポンス取得
    const response = await makeGeminiRequest(apiKey, model, fullPrompt, {
      temperature: 0.8,
      maxOutputTokens: 32768,
      isConnectionTest: false,
      useStructuredResponse: true,
      responseSchema: STRUCTURED_RESPONSE_SCHEMA,
    });

    try {
      // JSON レスポンスをパース
      const structuredResponse: StructuredAIResponse = JSON.parse(response.text);
      console.log('Successfully parsed structured response:', {
        title: structuredResponse.title.substring(0, 50) + '...',
        metaLength: structuredResponse.meta_description.length,
        categoriesCount: structuredResponse.categories.length,
        tagsCount: structuredResponse.tags.length,
        textLength: structuredResponse.text.length
      });

      // 構造化レスポンスをAISuggestion形式に変換
      return convertStructuredToAISuggestion(structuredResponse);
      
    } catch (parseError) {
      console.error('Failed to parse structured JSON response, falling back to markdown parsing:', parseError);
      // フォールバック: markdownパースを使用
      return parseMarkdownArticle(response.text);
    }

  } catch (error) {
    if (error instanceof GeminiAPIError) {
      throw error;
    }
    
    throw new GeminiAPIError(
      'GENERATION_ERROR',
      '構造化記事提案の生成中にエラーが発生しました',
      error
    );
  }
};

// 記事生成（従来版・互換性のため保持）
export const generateArticleSuggestions = async (
  apiKey: string,
  model: string,
  input: string,
  siteAnalysis?: SiteAnalysis,
  template?: PromptTemplate,
  fileContent?: {
    text: string;
    headings: Array<{ level: number; text: string }>;
    keywords: string[];
    structure: string;
  }
): Promise<AISuggestion> => {
  try {
    // レート制限チェック
    if (!rateLimiter.canMakeRequest(model, 3000)) {
      throw new GeminiAPIError(
        'RATE_LIMIT',
        'レート制限に達しました。しばらく待ってから再試行してください。'
      );
    }

    // コンテキスト情報の構築
    let context = '';
    if (siteAnalysis) {
      context += `\n\nサイト情報：
- よく使われるキーワード: ${siteAnalysis.commonKeywords.slice(0, 8).join(', ')}
- 平均記事文字数: ${siteAnalysis.averagePostLength}文字
- 既存カテゴリー: ${siteAnalysis.categories.map(c => c.name).slice(0, 5).join(', ')}`;
    }

    // ファイル内容情報の追加
    if (fileContent) {
      context += `\n\nアップロードファイル情報：
- 抽出キーワード: ${fileContent.keywords.slice(0, 5).join(', ')}
- 見出し数: ${fileContent.headings.length}`;
    }

    // プロンプトテンプレートの適用
    let systemPrompt = template?.system || SYSTEM_PROMPTS.analyze;
    if (template) {
      systemPrompt = `${template.system}

書き方のトーン: ${template.tone}
ターゲット読者: ${template.targetAudience}
SEO重視度: ${template.seoFocus}/10
記事の目的: ${template.purpose}`;
    }

    // 入力内容の構築
    let inputContent = input;
    if (fileContent && fileContent.text) {
      inputContent = `${input}

【参考ファイル内容】
${fileContent.text.substring(0, 1500)}${fileContent.text.length > 1500 ? '...(省略)' : ''}`;
    }

    // 現在の記事状態の検出
    const hasCurrentState = input.includes('現在の記事状態:') || input.includes('追加指示・修正要求:');
    
    if (hasCurrentState) {
      console.log('Detected article improvement request with current state context');
    }

    const fullPrompt = `${systemPrompt}${context}

【依頼内容】
${inputContent}

【重要な指示】
${hasCurrentState ? 
  '- 現在の記事状態を踏まえて、指定された修正・改善要求に対応してください\n- 既存の内容を活かしつつ、より良い記事に改善してください' : 
  '- 提供された情報を基に、SEOに最適化された高品質な記事を作成してください'
}

【出力形式】
以下の形式で記事を作成してください：

# [記事タイトル]

**メタディスクリプション:** [120-160文字のSEO最適化された説明文]

**推奨カテゴリー:** [カテゴリー1, カテゴリー2]
**推奨タグ:** [タグ1, タグ2, タグ3, タグ4, タグ5]

---

[記事本文をマークダウン形式で記述。適切な見出し構造（##, ###）を使用し、読みやすく構成された完全な記事を作成してください。]`;

    // レスポンス取得
    const response = await makeGeminiRequest(apiKey, model, fullPrompt, {
      temperature: 0.8,
      maxOutputTokens: 32768,
      isConnectionTest: false,
    });

    // マークダウン記事をパースしてAISuggestion形式に変換
    return parseMarkdownArticle(response.text);

  } catch (error) {
    if (error instanceof GeminiAPIError) {
      throw error;
    }
    
    throw new GeminiAPIError(
      'GENERATION_ERROR',
      '記事提案の生成中にエラーが発生しました',
      error
    );
  }
};

// 記事本文生成
export const generateArticleContent = async (
  apiKey: string,
  model: string,
  title: string,
  structure: AISuggestion['structure'],
  additionalInfo: {
    tone?: string;
    targetLength?: number;
    keywords?: string[];
  } = {}
): Promise<string> => {
  try {
    
    const { tone = 'professional', targetLength = 2000, keywords = [] } = additionalInfo;
    
    const prompt = `以下の情報を基に記事本文を作成してください：

タイトル: ${title}

記事構成:
${structure.headings.map((h, i) => 
  `${i + 1}. ${h.text} (${h.description})`
).join('\n')}

要件:
- 文字数: 約${targetLength}文字
- 文調: ${tone}
- キーワード: ${keywords.join(', ')}
- 読みやすい文章で作成
- 見出しタグ（H2, H3）を適切に使用

HTML形式で記事を作成してください。`;

    const response = await makeGeminiRequest(apiKey, model, prompt, {
      temperature: 0.7,
      maxOutputTokens: 65535,
    });

    return response.text;
    
  } catch (error) {
    if (error instanceof GeminiAPIError) {
      throw error;
    }
    
    throw new GeminiAPIError(
      'CONTENT_GENERATION_ERROR',
      '記事本文の生成中にエラーが発生しました',
      error
    );
  }
};

// コスト計算
export const calculateCost = (model: string, inputTokens: number, outputTokens: number): number => {
  const costs = COST_PER_1K_TOKENS[model as keyof typeof COST_PER_1K_TOKENS];
  if (!costs) return 0;
  
  const inputCost = (inputTokens / 1000) * costs.input;
  const outputCost = (outputTokens / 1000) * costs.output;
  
  return inputCost + outputCost;
};

// 利用可能なモデルリスト
export const getAvailableModels = () => {
  return [
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      description: '高品質・高精度な応答',
      costPer1k: COST_PER_1K_TOKENS['gemini-2.5-pro'].input,
    },
    {
      id: 'gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      description: '高速・低コストな応答',
      costPer1k: COST_PER_1K_TOKENS['gemini-2.5-flash'].input,
    },
  ];
};

// エラーハンドリング
export const handleGeminiError = (error: unknown): APIError => {
  if (error instanceof GeminiAPIError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Gemini APIエラーが発生しました',
    details: error,
    timestamp: new Date().toISOString(),
  };
};

// Gemini API接続テスト
export const testGeminiConnection = async (
  apiKey: string,
  model: string = DEFAULT_MODEL
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'APIキーが入力されていません' };
    }

    const testPrompt = 'こんにちは。接続テストです。「テスト成功」と返答してください。';
    
    const response = await makeGeminiRequest(
      apiKey,
      model,
      testPrompt,
      {
        maxOutputTokens: 50,
        temperature: 0,
        isConnectionTest: true,
      }
    );

    if (response.text && response.text.trim()) {
      return { success: true };
    } else {
      return { success: false, error: 'APIからの応答が不正です' };
    }
  } catch (error) {
    if (error instanceof GeminiAPIError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: '接続エラーが発生しました' };
  }
};

// 記事品質分析機能
export const analyzeArticleQuality = async (
  title: string,
  content: string,
  analysisConfig: {
    checkMisinformation: boolean;
    checkRecency: boolean;
    checkLogicalConsistency: boolean;
    checkSEO: boolean;
    checkReadability: boolean;
  },
  apiKey?: string,
  model: string = 'gemini-2.5-flash'
): Promise<GeminiQualityAnalysis> => {
  try {
    if (!apiKey) {
      throw new GeminiAPIError('NO_API_KEY', 'APIキーが提供されていません');
    }

    // HTMLタグを除去してプレーンテキストに変換
    const plainContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 分析する項目を決定
    const analysisItems = [];
    if (analysisConfig.checkMisinformation) analysisItems.push('誤情報のリスク');
    if (analysisConfig.checkRecency) analysisItems.push('情報の最新性');
    if (analysisConfig.checkLogicalConsistency) analysisItems.push('論理的整合性');
    if (analysisConfig.checkSEO) analysisItems.push('SEO要素');
    if (analysisConfig.checkReadability) analysisItems.push('読みやすさ');

    if (analysisItems.length === 0) {
      // 何もチェックしない場合は空の結果を返す
      return {
        misinformationRisk: { score: 100, issues: [], recommendations: [] },
        recencyCheck: { score: 100, outdatedInfo: [], updateSuggestions: [] },
        logicalConsistency: { score: 100, inconsistencies: [], improvements: [] },
        seoAnalysis: { metaDescriptionScore: 100, headingStructureScore: 100, brokenLinks: [], recommendations: [] },
        readabilityScore: { score: 100, sentenceLengthIssues: 0, complexTermsCount: 0, missingAltTexts: 0, suggestions: [] }
      };
    }

    const analysisPrompt = `記事品質分析を実行してください。

【記事タイトル】
${title}

【記事内容】
${plainContent.substring(0, 3000)}${plainContent.length > 3000 ? '...(省略)' : ''}

【分析項目】
${analysisItems.join(', ')}

【分析指示】
以下の各項目について0-100点のスコアと具体的な問題点・改善案を提供してください：

${analysisConfig.checkMisinformation ? `
1. 誤情報リスク分析 (0-100点):
- 事実確認が必要な記述の特定
- 信頼性に欠ける可能性のある情報
- 出典や根拠が不明確な主張
` : ''}

${analysisConfig.checkRecency ? `
2. 情報の最新性チェック (0-100点):
- 古くなっている可能性のある情報
- 更新が必要な統計データや法規制
- 最新トレンドとの整合性
` : ''}

${analysisConfig.checkLogicalConsistency ? `
3. 論理的整合性 (0-100点):
- 論理の飛躍や矛盾
- 根拠と結論の整合性
- 論理構造の明確性
` : ''}

${analysisConfig.checkSEO ? `
4. SEO要素分析 (0-100点):
- メタディスクリプションの適切性
- 見出し構造の階層性
- リンク切れの可能性
- SEO最適化の推奨事項
` : ''}

${analysisConfig.checkReadability ? `
5. 読みやすさ評価 (0-100点):
- 文章の長さの適切性
- 専門用語の説明不足
- 画像のalt属性不足
- 読みやすさ改善の提案
` : ''}

【回答形式】
JSON形式で以下の構造で回答してください：

{
  "misinformationRisk": {
    "score": 数値,
    "issues": ["問題点1", "問題点2"],
    "recommendations": ["改善案1", "改善案2"]
  },
  "recencyCheck": {
    "score": 数値,
    "outdatedInfo": ["古い情報1", "古い情報2"],
    "updateSuggestions": ["更新提案1", "更新提案2"]
  },
  "logicalConsistency": {
    "score": 数値,
    "inconsistencies": ["矛盾点1", "矛盾点2"],
    "improvements": ["改善案1", "改善案2"]
  },
  "seoAnalysis": {
    "metaDescriptionScore": 数値,
    "headingStructureScore": 数値,
    "brokenLinks": ["リンク1", "リンク2"],
    "recommendations": ["SEO改善案1", "SEO改善案2"]
  },
  "readabilityScore": {
    "score": 数値,
    "sentenceLengthIssues": 数値,
    "complexTermsCount": 数値,
    "missingAltTexts": 数値,
    "suggestions": ["読みやすさ改善案1", "読みやすさ改善案2"]
  }
}

分析しない項目についてはスコア100、空の配列で回答してください。`;

    // Gemini APIで分析実行
    const response = await makeGeminiRequest(apiKey, model, analysisPrompt, {
      temperature: 0.3, // 分析の一貫性のため低めに設定
      maxOutputTokens: 65535,
      isConnectionTest: false,
    });

    try {
      // レスポンスをクリーニング（マークダウンコードブロックを除去）
      let cleanedResponse = response.text.trim();
      
      // ```json で始まり ``` で終わるマークダウンコードブロックを除去
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '');
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      }
      
      // 先頭末尾の ``` のみを除去（汎用的な処理）
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      
      console.log('Debug - Gemini Response Cleaning:', {
        originalLength: response.text.length,
        cleanedLength: cleanedResponse.length,
        startsWith: cleanedResponse.substring(0, 50),
        endsWith: cleanedResponse.substring(cleanedResponse.length - 50)
      });
      
      // JSONレスポンスをパース
      const analysisResult: GeminiQualityAnalysis = JSON.parse(cleanedResponse);
      
      // データの妥当性チェック
      const sanitizedResult: GeminiQualityAnalysis = {
        misinformationRisk: {
          score: Math.max(0, Math.min(100, analysisResult.misinformationRisk?.score || 100)),
          issues: Array.isArray(analysisResult.misinformationRisk?.issues) ? analysisResult.misinformationRisk.issues : [],
          recommendations: Array.isArray(analysisResult.misinformationRisk?.recommendations) ? analysisResult.misinformationRisk.recommendations : []
        },
        recencyCheck: {
          score: Math.max(0, Math.min(100, analysisResult.recencyCheck?.score || 100)),
          outdatedInfo: Array.isArray(analysisResult.recencyCheck?.outdatedInfo) ? analysisResult.recencyCheck.outdatedInfo : [],
          updateSuggestions: Array.isArray(analysisResult.recencyCheck?.updateSuggestions) ? analysisResult.recencyCheck.updateSuggestions : []
        },
        logicalConsistency: {
          score: Math.max(0, Math.min(100, analysisResult.logicalConsistency?.score || 100)),
          inconsistencies: Array.isArray(analysisResult.logicalConsistency?.inconsistencies) ? analysisResult.logicalConsistency.inconsistencies : [],
          improvements: Array.isArray(analysisResult.logicalConsistency?.improvements) ? analysisResult.logicalConsistency.improvements : []
        },
        seoAnalysis: {
          metaDescriptionScore: Math.max(0, Math.min(100, analysisResult.seoAnalysis?.metaDescriptionScore || 100)),
          headingStructureScore: Math.max(0, Math.min(100, analysisResult.seoAnalysis?.headingStructureScore || 100)),
          brokenLinks: Array.isArray(analysisResult.seoAnalysis?.brokenLinks) ? analysisResult.seoAnalysis.brokenLinks : [],
          recommendations: Array.isArray(analysisResult.seoAnalysis?.recommendations) ? analysisResult.seoAnalysis.recommendations : []
        },
        readabilityScore: {
          score: Math.max(0, Math.min(100, analysisResult.readabilityScore?.score || 100)),
          sentenceLengthIssues: Math.max(0, analysisResult.readabilityScore?.sentenceLengthIssues || 0),
          complexTermsCount: Math.max(0, analysisResult.readabilityScore?.complexTermsCount || 0),
          missingAltTexts: Math.max(0, analysisResult.readabilityScore?.missingAltTexts || 0),
          suggestions: Array.isArray(analysisResult.readabilityScore?.suggestions) ? analysisResult.readabilityScore.suggestions : []
        }
      };

      return sanitizedResult;
      
    } catch (parseError) {
      console.error('Failed to parse quality analysis JSON response:', parseError);
      console.error('Raw response (first 500 chars):', response.text.substring(0, 500));
      console.error('Raw response (last 100 chars):', response.text.substring(Math.max(0, response.text.length - 100)));
      
      // JSONパースエラーの詳細情報をログ出力
      if (parseError instanceof SyntaxError) {
        console.error('JSON Syntax Error details:', {
          message: parseError.message,
          responseStartsWith: response.text.substring(0, 100),
          responseEndsWith: response.text.substring(Math.max(0, response.text.length - 100)),
          containsMarkdown: response.text.includes('```'),
          cleanedResponseStart: cleanedResponse.substring(0, 100)
        });
      }
      
      // パースに失敗した場合は簡易分析結果を返す
      return {
        misinformationRisk: {
          score: 80,
          issues: ['JSONパースエラーのため詳細分析できませんでした'],
          recommendations: ['手動での内容確認を推奨します']
        },
        recencyCheck: {
          score: 80,
          outdatedInfo: ['分析エラーのため確認できませんでした'],
          updateSuggestions: ['手動での最新性確認を推奨します']
        },
        logicalConsistency: {
          score: 80,
          inconsistencies: ['分析エラーのため確認できませんでした'],
          improvements: ['手動での論理性確認を推奨します']
        },
        seoAnalysis: {
          metaDescriptionScore: 80,
          headingStructureScore: 80,
          brokenLinks: [],
          recommendations: ['手動でのSEO確認を推奨します']
        },
        readabilityScore: {
          score: 80,
          sentenceLengthIssues: 0,
          complexTermsCount: 0,
          missingAltTexts: 0,
          suggestions: ['手動での読みやすさ確認を推奨します']
        }
      };
    }

  } catch (error) {
    if (error instanceof GeminiAPIError) {
      throw error;
    }
    
    throw new GeminiAPIError(
      'QUALITY_ANALYSIS_ERROR',
      '記事品質分析中にエラーが発生しました',
      error
    );
  }
};

export default {
  validateGeminiApiKey,
  generateArticleSuggestions,
  generateArticleContent,
  calculateCost,
  getAvailableModels,
  handleGeminiError,
  testGeminiConnection,
  analyzeArticleQuality,
};