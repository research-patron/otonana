import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Alert,
  Snackbar,
  CircularProgress,
  Backdrop,
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
} from '@mui/material';
import StepWizard, { type StepType } from '../components/creation/StepWizard';
import InputSelector, { type InputMode } from '../components/creation/InputSelector';
import CategorySelector from '../components/creation/CategorySelector';
import CSVGenerationStep from '../components/creation/CSVGenerationStep';
import AIResultDisplay from '../components/creation/AIResultDisplay';
import ArticleEditor from '../components/editor/ArticleEditor';
import { useAppStore, useDraftStore, useAnalysisStore, useSuggestionStore } from '../store';
import { analyzeSite, createPost } from '../services/wordpress';
import { generateArticleSuggestions, generateArticleSuggestionsStructured } from '../services/gemini';
import { generateUltrathinkAISuggestion } from '../services/ultrathinkAI';
import csvManager from '../services/csvManager';
import { formatFullArticleToHTML, cleanupHTML } from '../utils/contentFormatter';
import type { DraftArticle, WordPressCategory, WordPressTag, SiteAnalysis, PromptTemplate, CSVManagerState, WordPressSite } from '../types';
import type { FileProcessingResult } from '../services/fileProcessor';

function CreateArticle() {
  const navigate = useNavigate();
  
  // Store hooks
  const { config, user } = useAppStore();
  const { addDraft, updateDraft } = useDraftStore();
  const { getAnalysis, setAnalysis } = useAnalysisStore();
  const { currentSuggestion, setSuggestion, setLoading, isLoading } = useSuggestionStore();

  // Local state
  const [categories, setCategories] = useState<WordPressCategory[]>([]);
  const [tags, setTags] = useState<WordPressTag[]>([]);
  const [currentSiteAnalysis, setCurrentSiteAnalysis] = useState<SiteAnalysis | null>(null);
  const [alert, setAlert] = useState<{ message: string; severity: 'success' | 'error' | 'info' } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [fileContent, setFileContent] = useState<FileProcessingResult | null>(null);
  
  // Ultrathink AI関連の状態
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [csvState, setCsvState] = useState<CSVManagerState | null>(null);
  const [isGeneratingCSV, setIsGeneratingCSV] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [currentSite, setCurrentSite] = useState<WordPressSite | null>(null);
  
  // ステップ管理
  const [currentStep, setCurrentStep] = useState<StepType>('category-selection');
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [originalInput, setOriginalInput] = useState('');
  const [currentDraft, setCurrentDraft] = useState<Partial<DraftArticle> | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);

  // 初期化処理
  useEffect(() => {
    const initializeEditor = async () => {
      if (!config?.currentSiteId || !config.sites.length) {
        setAlert({ message: 'WordPressサイトが設定されていません。設定画面で追加してください。', severity: 'error' });
        return;
      }

      const currentSite = config.sites.find(site => site.id === config.currentSiteId);
      if (!currentSite) {
        setAlert({ message: '選択されたサイトが見つかりません。', severity: 'error' });
        return;
      }

      // 現在のサイトを設定
      setCurrentSite(currentSite);

      try {
        // キャッシュされた分析データを確認
        let analysis = getAnalysis(currentSite.id);
        
        if (!analysis || isAnalysisExpired(analysis)) {
          setAlert({ message: 'サイト分析を実行しています...', severity: 'info' });
          analysis = await analyzeSite(currentSite, { postCount: 20 });
          setAnalysis(currentSite.id, analysis);
        }

        setCurrentSiteAnalysis(analysis);
        setCategories(analysis.categories);
        setTags(analysis.tags);

        // 既存のCSV状態を読み込み
        const existingCsvState = csvManager.getCSVState(currentSite.id);
        if (existingCsvState) {
          setCsvState(existingCsvState);
          setSelectedCategoryIds(existingCsvState.selectedCategoryIds);
          
          // 既存CSVがある場合は入力ステップから開始
          if (existingCsvState.csvData.length > 0) {
            setCurrentStep('input');
            setAlert({ message: '既存の記事分析データを読み込みました。記事要求を入力してください。', severity: 'info' });
          } else {
            setAlert({ message: 'エディタの準備が完了しました。カテゴリーを選択してください。', severity: 'success' });
          }
        } else {
          setAlert({ message: 'エディタの準備が完了しました。カテゴリーを選択してください。', severity: 'success' });
        }
      } catch (error) {
        console.error('Site analysis failed:', error);
        setAlert({ message: 'サイト分析に失敗しました。サイト設定を確認してください。', severity: 'error' });
      }
    };

    initializeEditor();
  }, [config, getAnalysis, setAnalysis]);

  const isAnalysisExpired = (analysis: SiteAnalysis): boolean => {
    const expireTime = 60 * 60 * 1000; // 1時間
    return Date.now() - new Date(analysis.analyzedAt).getTime() > expireTime;
  };

  // Ultrathink AI関連のハンドラー
  const handleCategoryNext = () => {
    if (selectedCategoryIds.length === 0) {
      setAlert({ message: 'カテゴリーを選択してください', severity: 'error' });
      return;
    }
    setCurrentStep('csv-generation');
    
    // 自動的にCSV生成を開始
    handleGenerateCSV();
  };

  const handleGenerateCSV = async () => {
    if (!currentSite) {
      setAlert({ message: 'サイト情報が取得できません', severity: 'error' });
      return;
    }

    setIsGeneratingCSV(true);
    setCsvError(null);
    
    try {
      const updatedState = await csvManager.updateCSVData(
        currentSite,
        selectedCategoryIds,
        ['publish'], // 公開済み記事のみを対象
        false // 増分更新
      );
      
      setCsvState(updatedState);
      setAlert({ message: `記事分析が完了しました（${updatedState.totalArticles}記事）`, severity: 'success' });
    } catch (error) {
      console.error('CSV generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'CSV生成に失敗しました';
      setCsvError(errorMessage);
      setAlert({ message: errorMessage, severity: 'error' });
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const handleForceUpdateCSV = async () => {
    if (!currentSite) return;
    
    setIsGeneratingCSV(true);
    setCsvError(null);
    
    try {
      const updatedState = await csvManager.updateCSVData(
        currentSite,
        selectedCategoryIds,
        ['publish'],
        true // 強制全体更新
      );
      
      setCsvState(updatedState);
      setAlert({ message: `記事データを強制更新しました（${updatedState.totalArticles}記事）`, severity: 'success' });
    } catch (error) {
      console.error('CSV force update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'CSV更新に失敗しました';
      setCsvError(errorMessage);
      setAlert({ message: errorMessage, severity: 'error' });
    } finally {
      setIsGeneratingCSV(false);
    }
  };

  const handleCSVNext = () => {
    if (!csvState || csvState.csvData.length === 0) {
      setAlert({ message: '記事データが生成されていません', severity: 'error' });
      return;
    }
    setCurrentStep('input');
  };

  // CSV分析をやり直す
  const handleRestartAnalysis = () => {
    // CSV状態をクリア
    setCsvState(null);
    setSelectedCategoryIds([]);
    setCsvError(null);
    
    // カテゴリー選択ステップに戻る
    setCurrentStep('category-selection');
    setAlert({ message: 'カテゴリー選択からやり直します', severity: 'info' });
  };

  // AI提案生成
  const handleGenerateAI = async (input: string, customPrompt?: string) => {
    if (!config?.geminiApiKey || !input.trim()) {
      setAlert({ message: 'Gemini APIキーが設定されていないか、入力内容が空です。', severity: 'error' });
      return;
    }

    if (!config.currentSiteId) {
      setAlert({ message: 'サイトが選択されていません。設定を確認してください。', severity: 'error' });
      return;
    }

    const startTime = Date.now();
    console.log('Starting AI suggestion generation with input:', input.substring(0, 100) + '...');

    try {
      setLoading(true);
      setGenerationProgress(20);
      
      // CSVデータがある場合はUltrathink AIを使用
      if (csvState && csvState.csvData.length > 0 && currentSite) {
        console.log('Using Ultrathink AI with CSV data:', csvState.csvData.length, 'articles');
        
        const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id));
        
        const ultrathinkRequest = {
          userInput: input,
          csvData: csvState.csvData,
          selectedCategories,
          fileContent: fileContent ? {
            text: fileContent.content.text,
            filename: fileContent.filename,
            wordCount: fileContent.content.wordCount,
          } : undefined,
          promptTemplate: customPrompt ? {
            id: 'custom',
            name: 'カスタムプロンプト',
            system: customPrompt,
            tone: 'professional' as const,
            targetAudience: 'ユーザー設定',
            seoFocus: 8,
            purpose: 'information' as const,
          } : undefined,
        };

        setGenerationProgress(50);
        const apiKey = config.geminiApiKey;
        console.log('Debug - CreateArticle (Ultrathink): API Key present:', !!apiKey);
        console.log('Debug - CreateArticle (Ultrathink): API Key length:', apiKey?.length || 0);
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
        }
        const suggestion = await generateUltrathinkAISuggestion(apiKey, ultrathinkRequest);
        setGenerationProgress(80);
        setSuggestion(suggestion);
        
        console.log('Ultrathink AI suggestion generated successfully');
      } else {
        // 従来のAI提案を使用
        console.log('Using traditional AI suggestion (no CSV data available)');
        setGenerationProgress(30);
        
        // プロンプトテンプレートを作成
        let template: PromptTemplate | undefined = undefined;
        
        try {
          // カスタムプロンプトが提供された場合はそれを使用、そうでなければ設定から取得
          const systemPrompt = customPrompt || config.prompts?.system || '';
          
          if (systemPrompt && systemPrompt.trim()) {
            template = {
              id: 'user_system_prompt',
              name: 'システムプロンプト',
              system: systemPrompt,
              tone: 'professional' as const,
              targetAudience: 'ユーザー設定',
              seoFocus: 8,
              purpose: 'information' as const,
            };
            console.log('Using system prompt template:', template);
          } else {
            console.log('No system prompt found, using default AI behavior');
          }
        } catch (error) {
          console.error('Error creating prompt template:', error);
          setAlert({ message: 'プロンプトテンプレートの作成に失敗しました', severity: 'error' });
        }

        // 構造化レスポンス機能を試行し、失敗した場合は従来方式にフォールバック
        let suggestion;
        
        const apiKey = config.geminiApiKey;
        console.log('Debug - CreateArticle (Standard): API Key present:', !!apiKey);
        console.log('Debug - CreateArticle (Standard): API Key length:', apiKey?.length || 0);
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
        }
        
        try {
          console.log('Attempting structured response generation...');
          suggestion = await generateArticleSuggestionsStructured(
            apiKey,
            config.selectedModel,
            input,
            currentSiteAnalysis || undefined,
            template,
            fileContent ? {
              text: fileContent.content.text,
              headings: fileContent.content.headings,
              keywords: fileContent.content.keywords,
              structure: fileContent.content.structure,
            } : undefined
          );
          console.log('Structured response generation successful!');
        } catch (structuredError) {
          console.warn('Structured response failed, falling back to traditional method:', structuredError);
          
          suggestion = await generateArticleSuggestions(
            apiKey,
            config.selectedModel,
            input,
            currentSiteAnalysis || undefined,
            template,
            fileContent ? {
              text: fileContent.content.text,
              headings: fileContent.content.headings,
              keywords: fileContent.content.keywords,
              structure: fileContent.content.structure,
            } : undefined
          );
          console.log('Traditional markdown parsing completed');
        }

        setGenerationProgress(80);
        setSuggestion(suggestion);
      }
      
      setGenerationProgress(100);
      
      // AI提案結果を表示
      setTimeout(() => {
        setCurrentStep('ai-result');
        setAlert({ message: 'AI提案を生成しました。内容を確認してください。', severity: 'success' });
      }, 500);
    } catch (error) {
      console.error('AI suggestion failed:', error);
      setAlert({ message: 'AI提案の生成に失敗しました。APIキーと通信状況を確認してください。', severity: 'error' });
    } finally {
      setLoading(false);
      setGenerationProgress(0);
    }
  };

  // ファイル処理完了時の処理
  const handleFileProcessed = (result: FileProcessingResult) => {
    setFileContent(result);
    setAlert({ 
      message: `ファイル「${result.filename}」を処理しました（${result.content.wordCount}文字）`, 
      severity: 'success' 
    });
  };

  // ファイル処理エラー時の処理
  const handleFileError = (error: string) => {
    setAlert({ message: error, severity: 'error' });
  };

  // 下書き保存
  const handleSave = async (article: Partial<DraftArticle>) => {
    if (!config?.currentSiteId) return;

    try {
      // 基本的な文字数計算
      const plainTextContent = article.content?.replace(/<[^>]*>/g, '') || '';
      const wordCount = plainTextContent.length;
      
      // AI提案に関連する情報を追加
      const enhancedDraftData: Omit<DraftArticle, 'id' | 'createdAt' | 'updatedAt'> = {
        ...article,
        siteId: config.currentSiteId,
        
        // ファイル関連情報
        sourceFile: fileContent?.filename,
        originalInput: originalInput || article.content,
        usedPrompt: currentSuggestion ? originalInput : undefined,
        fileMetadata: fileContent ? JSON.stringify({
          filename: fileContent.filename,
          fileSize: fileContent.content.text.length,
          wordCount: fileContent.content.wordCount,
          headings: fileContent.content.headings,
          keywords: fileContent.content.keywords,
        }) : undefined,
        
        // AI提案関連情報
        aiSuggestionId: currentSuggestion ? `suggestion_${Date.now()}` : undefined,
        
        // 基本的なSEO情報
        wordCount,
        keywords: fileContent?.content.keywords || [],
      } as Omit<DraftArticle, 'id' | 'createdAt' | 'updatedAt'>;

      const savedDraft = addDraft(enhancedDraftData);
      
      setAlert({ message: '下書きを保存しました', severity: 'success' });
    } catch (error) {
      console.error('Draft save failed:', error);
      setAlert({ message: '下書きの保存に失敗しました', severity: 'error' });
    }
  };

  // 記事公開
  const handlePublish = async (article: Partial<DraftArticle>) => {
    if (!config?.currentSiteId || !article.title || !article.content) {
      setAlert({ message: 'タイトルと本文は必須です', severity: 'error' });
      return;
    }

    const currentSite = config.sites.find(site => site.id === config.currentSiteId);
    if (!currentSite) {
      setAlert({ message: 'サイト情報が見つかりません', severity: 'error' });
      return;
    }

    try {
      setIsPublishing(true);

      const postData = {
        title: article.title,
        content: article.content,
        excerpt: article.metaDescription || '',
        categories: article.categories || [],
        tags: article.tags || [],
        status: 'publish' as const,
      };

      const publishedPost = await createPost(currentSite, postData);
      
      setAlert({ message: `記事「${article.title}」を公開しました`, severity: 'success' });
      
      // 公開成功後は下書き一覧に移動
      setTimeout(() => {
        navigate('/drafts');
      }, 2000);
      
    } catch (error) {
      console.error('Publish failed:', error);
      setAlert({ message: '記事の公開に失敗しました。権限と接続状況を確認してください。', severity: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  // 予約投稿
  const handleSchedulePublish = async (article: Partial<DraftArticle>, publishDate: Date) => {
    if (!config?.currentSiteId || !article.title || !article.content) {
      setAlert({ message: 'タイトルと本文は必須です', severity: 'error' });
      return;
    }

    const currentSite = config.sites.find(site => site.id === config.currentSiteId);
    if (!currentSite) {
      setAlert({ message: 'サイト情報が見つかりません', severity: 'error' });
      return;
    }

    try {
      setIsPublishing(true);

      // カテゴリーとタグの処理
      const validCategories = (article.categories || []).filter(id => id !== undefined && id !== null);
      const validTags = (article.tags || []).filter(id => id !== undefined && id !== null);

      const postData = {
        title: article.title,
        content: article.content,
        excerpt: article.metaDescription || '',
        categories: validCategories,
        tags: validTags,
        status: 'future' as const,
        date: publishDate.toISOString(),
      };

      const scheduledPost = await createPost(currentSite, postData);
      
      setAlert({ 
        message: `記事「${article.title}」を${publishDate.toLocaleString('ja-JP')}に予約投稿しました`, 
        severity: 'success' 
      });
      
      // 予約投稿成功後は下書き一覧に移動
      setTimeout(() => {
        navigate('/drafts');
      }, 2000);
      
    } catch (error) {
      console.error('Schedule publish failed:', error);
      setAlert({ message: '予約投稿の設定に失敗しました。権限と接続状況を確認してください。', severity: 'error' });
    } finally {
      setIsPublishing(false);
    }
  };

  // プレビュー機能
  const handlePreview = (article: Partial<DraftArticle>) => {
    // 新しいウィンドウでプレビューを開く
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${article.title || '無題の記事'}</title>
          <meta name="description" content="${article.metaDescription || ''}">
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            h1, h2, h3, h4, h5, h6 {
              font-weight: 600;
              line-height: 1.3;
              margin: 1.5em 0 0.5em 0;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
            h3 { font-size: 1.25em; }
            p { margin: 0 0 1em 0; }
            img { max-width: 100%; height: auto; }
            blockquote {
              border-left: 4px solid #ddd;
              margin: 1em 0;
              padding: 0.5em 1em;
              font-style: italic;
              background: #f9f9f9;
            }
            code {
              background: #f4f4f4;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            }
            pre {
              background: #f4f4f4;
              padding: 1em;
              border-radius: 3px;
              overflow-x: auto;
            }
            .meta {
              background: #f8f9fa;
              padding: 1em;
              border-radius: 5px;
              margin-bottom: 2em;
              border-left: 4px solid #007cba;
            }
            .preview-note {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 10px;
              border-radius: 5px;
              margin-bottom: 20px;
              text-align: center;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="preview-note">
            📝 これは記事のプレビューです。実際の公開時とは表示が異なる場合があります。
          </div>
          <div class="meta">
            <strong>メタディスクリプション:</strong><br>
            ${article.metaDescription || '（設定されていません）'}
          </div>
          <h1>${article.title || '無題の記事'}</h1>
          <div>${article.content || '（本文が入力されていません）'}</div>
        </body>
        </html>
      `);
    }
  };

  // AI提案採用処理
  const handleAdoptSuggestion = (selectedTitleIndex: number, selectedMetaDescriptionIndex: number) => {
    if (!currentSuggestion) return;

    // 構造化レスポンスがある場合は、それを優先的に使用
    let suggestedTitle, suggestedMetaDescription, suggestedContent;
    
    if (currentSuggestion.structuredResponse) {
      console.log('Using structured response for adoption:', currentSuggestion.structuredResponse);
      
      // 構造化レスポンスから直接フィールドを取得
      suggestedTitle = currentSuggestion.structuredResponse.title;
      suggestedMetaDescription = currentSuggestion.structuredResponse.meta_description;
      
      // 純粋な記事本文を取得（markdown形式からHTMLに変換）
      suggestedContent = currentSuggestion.structuredResponse.text;
      
      // markdown形式の場合はHTMLに変換
      if (suggestedContent.includes('#') || suggestedContent.includes('**')) {
        // 簡易的なmarkdown → HTML変換
        suggestedContent = suggestedContent
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(?!<[h1-6]|<\/[h1-6]|<p>|<\/p>)(.+)$/gm, '<p>$1</p>')
          .replace(/<p><\/p>/g, '');
        
        if (!suggestedContent.startsWith('<')) {
          suggestedContent = '<p>' + suggestedContent + '</p>';
        }
      }
      
      console.log('Structured adoption - Content length:', suggestedContent.length);
    } else {
      // 従来方式：選択されたインデックスを使用
      suggestedTitle = currentSuggestion.titles[selectedTitleIndex] || currentSuggestion.titles[0] || '';
      suggestedMetaDescription = currentSuggestion.metaDescriptions[selectedMetaDescriptionIndex] || currentSuggestion.metaDescriptions[0] || '';
      
      // AI提案を構造化されたHTMLに変換
      if (currentSuggestion.fullArticle) {
        const formattedHTML = formatFullArticleToHTML(currentSuggestion);
        suggestedContent = cleanupHTML(formattedHTML);
      } else {
        suggestedContent = '';
      }
      
      console.log('Traditional adoption - Content length:', suggestedContent.length);
    }

    // カテゴリー・タグのIDマッピング処理
    let categoryIds: number[] = [];
    let tagIds: number[] = [];
    
    if (currentSuggestion.structuredResponse) {
      console.log('handleAdoptSuggestion: Mapping structured categories and tags to IDs');
      
      // 構造化レスポンスのカテゴリー文字列をIDにマッピング
      const categoryNames = currentSuggestion.structuredResponse.categories || [];
      categoryIds = categoryNames.map(name => {
        const foundCategory = categories.find(cat => 
          cat.name.toLowerCase() === name.toLowerCase()
        );
        if (foundCategory) {
          console.log(`Found existing category: ${name} -> ID ${foundCategory.id}`);
          return foundCategory.id;
        } else {
          console.log(`Category not found: ${name} (will need to create new)`);
          // 今後の実装: 新規カテゴリー作成
          return null;
        }
      }).filter(id => id !== null) as number[];
      
      // 構造化レスポンスのタグ文字列をIDにマッピング
      const tagNames = currentSuggestion.structuredResponse.tags || [];
      tagIds = tagNames.map(name => {
        const foundTag = tags.find(tag => 
          tag.name.toLowerCase() === name.toLowerCase()
        );
        if (foundTag) {
          console.log(`Found existing tag: ${name} -> ID ${foundTag.id}`);
          return foundTag.id;
        } else {
          console.log(`Tag not found: ${name} (will need to create new)`);
          // 今後の実装: 新規タグ作成
          return null;
        }
      }).filter(id => id !== null) as number[];
      
      console.log('handleAdoptSuggestion: Mapped categories:', categoryIds);
      console.log('handleAdoptSuggestion: Mapped tags:', tagIds);
    } else {
      // 従来方式のカテゴリー・タグ
      categoryIds = [...currentSuggestion.categories.existing];
      tagIds = [...currentSuggestion.tags.existing];
    }

    // エディタ用の下書きデータをセット
    setCurrentDraft({
      title: suggestedTitle,
      content: suggestedContent,
      metaDescription: suggestedMetaDescription,
      categories: categoryIds,
      tags: tagIds,
      status: 'ready_to_publish',
    });
    
    // 編集ステップに移動
    setCurrentStep('editing');
    setAlert({ message: 'AI提案を採用しました。内容を確認・編集してください。', severity: 'success' });
  };

  // 手動編集モードに切り替え
  const handleEditManually = () => {
    if (!currentSuggestion) {
      console.error('handleEditManually: currentSuggestion is null');
      return;
    }

    // 構造化レスポンスがある場合は、それを優先的に使用
    let suggestedTitle, suggestedMetaDescription, suggestedContent;
    
    if (currentSuggestion.structuredResponse) {
      console.log('handleEditManually: Using structured response:', currentSuggestion.structuredResponse);
      
      // 構造化レスポンスから直接フィールドを取得
      suggestedTitle = currentSuggestion.structuredResponse.title;
      suggestedMetaDescription = currentSuggestion.structuredResponse.meta_description;
      
      // 純粋な記事本文を取得（markdown形式からHTMLに変換）
      suggestedContent = currentSuggestion.structuredResponse.text;
      
      // markdown形式の場合はHTMLに変換
      if (suggestedContent.includes('#') || suggestedContent.includes('**')) {
        suggestedContent = suggestedContent
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^(?!<[h1-6]|<\/[h1-6]|<p>|<\/p>)(.+)$/gm, '<p>$1</p>')
          .replace(/<p><\/p>/g, '');
        
        if (!suggestedContent.startsWith('<')) {
          suggestedContent = '<p>' + suggestedContent + '</p>';
        }
      }
      
      console.log('handleEditManually: Structured content length:', suggestedContent.length);
    } else {
      // 従来方式
      suggestedTitle = currentSuggestion.titles[0] || '';
      suggestedMetaDescription = currentSuggestion.metaDescriptions[0] || '';
      console.log('handleEditManually: suggestedTitle:', suggestedTitle);
      
      // AI提案を構造化されたHTMLに変換（手動編集用）
      suggestedContent = '';
      console.log('handleEditManually: currentSuggestion.fullArticle:', currentSuggestion.fullArticle);
      
      if (currentSuggestion.fullArticle) {
        console.log('handleEditManually: fullArticle exists, converting to HTML...');
        const formattedHTML = formatFullArticleToHTML(currentSuggestion);
        console.log('handleEditManually: formattedHTML length:', formattedHTML.length);
        console.log('handleEditManually: formattedHTML sample:', formattedHTML.substring(0, 200) + '...');
        
        suggestedContent = cleanupHTML(formattedHTML);
        console.log('handleEditManually: cleaned content length:', suggestedContent.length);
        console.log('handleEditManually: cleaned content sample:', suggestedContent.substring(0, 200) + '...');
      } else {
        console.warn('handleEditManually: fullArticle is null or undefined');
      }
    }

    // カテゴリー・タグのIDマッピング処理
    let categoryIds: number[] = [];
    let tagIds: number[] = [];
    
    if (currentSuggestion.structuredResponse) {
      console.log('handleEditManually: Mapping structured categories and tags to IDs');
      
      // 構造化レスポンスのカテゴリー文字列をIDにマッピング
      const categoryNames = currentSuggestion.structuredResponse.categories || [];
      categoryIds = categoryNames.map(name => {
        const foundCategory = categories.find(cat => 
          cat.name.toLowerCase() === name.toLowerCase()
        );
        if (foundCategory) {
          console.log(`Found existing category: ${name} -> ID ${foundCategory.id}`);
          return foundCategory.id;
        } else {
          console.log(`Category not found: ${name} (will need to create new)`);
          // 今後の実装: 新規カテゴリー作成
          return null;
        }
      }).filter(id => id !== null) as number[];
      
      // 構造化レスポンスのタグ文字列をIDにマッピング
      const tagNames = currentSuggestion.structuredResponse.tags || [];
      tagIds = tagNames.map(name => {
        const foundTag = tags.find(tag => 
          tag.name.toLowerCase() === name.toLowerCase()
        );
        if (foundTag) {
          console.log(`Found existing tag: ${name} -> ID ${foundTag.id}`);
          return foundTag.id;
        } else {
          console.log(`Tag not found: ${name} (will need to create new)`);
          // 今後の実装: 新規タグ作成
          return null;
        }
      }).filter(id => id !== null) as number[];
      
      console.log('handleEditManually: Mapped categories:', categoryIds);
      console.log('handleEditManually: Mapped tags:', tagIds);
    } else {
      // 従来方式のカテゴリー・タグ
      categoryIds = [...currentSuggestion.categories.existing];
      tagIds = [...currentSuggestion.tags.existing];
    }

    const draftData: Partial<DraftArticle> = {
      title: suggestedTitle,
      content: suggestedContent,
      metaDescription: suggestedMetaDescription,
      categories: categoryIds,
      tags: tagIds,
      status: 'draft',
    };

    console.log('handleEditManually: final draftData:', {
      title: draftData.title,
      contentLength: draftData.content?.length || 0,
      metaDescription: draftData.metaDescription,
      categoriesCount: draftData.categories?.length || 0,
      tagsCount: draftData.tags?.length || 0
    });

    setCurrentDraft(draftData);
    // 編集ステップに移動
    setCurrentStep('editing');
    setAlert({ message: '編集モードに切り替えました。内容を自由に編集できます。', severity: 'info' });
  };

  // 新しいプロンプトで再提案
  const handleRegenerateWithPrompt = async (newPrompt: string) => {
    const inputWithPrompt = `${originalInput}\n\n追加指示: ${newPrompt}`;
    await handleGenerateAI(inputWithPrompt);
  };

  // AI結果表示をキャンセル
  const handleCancelAIResult = () => {
    setCurrentStep('input');
    setOriginalInput('');
    setSuggestion(null);
    setInputMode('none');
    setAlert({ message: 'AI提案をキャンセルしました。最初からやり直してください。', severity: 'info' });
  };

  // 入力準備完了時の処理
  const handleInputReady = async (input: string, fileContent?: FileProcessingResult) => {
    setOriginalInput(input);
    if (fileContent) {
      setFileContent(fileContent);
    }
    setCurrentStep('ai-generation');
    setGenerationProgress(10);
    
    // AI提案生成を開始
    await handleGenerateAI(input);
  };

  // ステップ変更処理
  const handleStepChange = (step: StepType) => {
    // 特定の条件下でのみステップ移動を許可
    if (step === 'input') {
      setCurrentStep('input');
      setInputMode('none');
      setCurrentDraft(null);
      setSuggestion(null);
    } else if (step === 'editing' && currentDraft) {
      setCurrentStep('editing');
    }
  };

  const closeAlert = () => {
    setAlert(null);
  };

  if (!config) {
    return (
      <Container>
        <Alert severity="error">
          アプリケーションの初期化に失敗しました。ページを再読み込みしてください。
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* ローディングオーバーレイ */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isPublishing}
      >
        <CircularProgress color="inherit" />
      </Backdrop>

      {/* ステップウィザード */}
      <StepWizard 
        currentStep={currentStep} 
        onStepChange={handleStepChange}
      >
        {/* ステップ1: カテゴリー選択 */}
        {currentStep === 'category-selection' && (
          <CategorySelector
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            onCategoryChange={setSelectedCategoryIds}
            onNext={handleCategoryNext}
            disabled={isLoading || isPublishing}
            loading={!categories.length}
          />
        )}

        {/* ステップ2: CSV生成・データ分析 */}
        {currentStep === 'csv-generation' && currentSite && (
          <CSVGenerationStep
            site={currentSite}
            selectedCategories={categories.filter(cat => selectedCategoryIds.includes(cat.id))}
            csvState={csvState}
            isGenerating={isGeneratingCSV}
            error={csvError}
            onGenerate={handleGenerateCSV}
            onForceUpdate={handleForceUpdateCSV}
            onNext={handleCSVNext}
            disabled={isLoading || isPublishing}
          />
        )}

        {/* ステップ3: 入力方法選択 */}
        {currentStep === 'input' && (
          <InputSelector
            onInputReady={handleInputReady}
            onModeChange={setInputMode}
            onRestartAnalysis={handleRestartAnalysis}
            isLoading={isLoading}
            disabled={isLoading || isPublishing}
            hasExistingCSVData={csvState !== null && csvState.csvData.length > 0}
          />
        )}

        {/* ステップ4: AI提案生成中 */}
        {currentStep === 'ai-generation' && (
          <Card elevation={2} sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h5" gutterBottom>
                AI提案を生成中...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                あなたの入力内容を分析して、最適な記事提案を作成しています
              </Typography>
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={generationProgress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                進捗: {generationProgress}%
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* ステップ5: AI提案結果表示 */}
        {currentStep === 'ai-result' && currentSuggestion && (
          <AIResultDisplay
            suggestion={currentSuggestion}
            originalInput={originalInput}
            fileContent={fileContent}
            categories={categories}
            tags={tags}
            onAdoptSuggestion={handleAdoptSuggestion}
            onEditManually={handleEditManually}
            onRegenerateWithPrompt={handleRegenerateWithPrompt}
            onCancel={handleCancelAIResult}
            isLoading={isLoading}
          />
        )}

        {/* ステップ6: 記事編集 */}
        {currentStep === 'editing' && (
          <ArticleEditor
            draft={currentDraft}
            categories={categories}
            tags={tags}
            suggestion={currentSuggestion}
            onSave={handleSave}
            onPublish={handlePublish}
            onSchedulePublish={handleSchedulePublish}
            onPreview={handlePreview}
            onGenerateAI={handleGenerateAI}
            onFileProcessed={handleFileProcessed}
            onFileError={handleFileError}
            onCategoriesUpdate={setCategories}
            onTagsUpdate={setTags}
            isLoading={isLoading || isPublishing}
            fileContent={fileContent}
            originalInput={originalInput}
            autoApplyNewSuggestion={false}
          />
        )}
      </StepWizard>

      {/* アラート表示 */}
      <Snackbar
        open={!!alert}
        autoHideDuration={alert?.severity === 'error' ? null : 6000}
        onClose={closeAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {alert && (
          <Alert onClose={closeAlert} severity={alert.severity} sx={{ width: '100%' }}>
            {alert.message}
          </Alert>
        )}
      </Snackbar>
    </Container>
  );
}

export default CreateArticle;