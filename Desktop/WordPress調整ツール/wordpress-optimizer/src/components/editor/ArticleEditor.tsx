import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Publish as PublishIcon,
  Preview as PreviewIcon,
  AutoFixHigh as AIIcon,
  Schedule as ScheduleIcon,
  Event as EventIcon,
  RestartAlt as ResetIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import RichTextEditor from './RichTextEditor';
import MarkdownEditor from './MarkdownEditor';
import FileUploader from './FileUploader';
import { useAppStore } from '../../store';
import type { DraftArticle, WordPressCategory, WordPressTag, AISuggestion, WordPressPost } from '../../types';
import type { FileProcessingResult } from '../../services/fileProcessor';

interface ArticleEditorProps {
  draft?: DraftArticle;
  categories: WordPressCategory[];
  tags: WordPressTag[];
  suggestion?: AISuggestion;
  onSave: (article: Partial<DraftArticle>) => void;
  onPublish: (article: Partial<DraftArticle>) => void;
  onSchedulePublish: (article: Partial<DraftArticle>, publishDate: Date) => void;
  onPreview: (article: Partial<DraftArticle>) => void;
  onGenerateAI: (input: string, currentPrompt?: string) => void;
  onFileProcessed: (result: FileProcessingResult) => void;
  onFileError: (error: string) => void;
  fileContent?: FileProcessingResult | null;
  isLoading?: boolean;
  onAIAdoptionStart?: () => void; // AI提案採用開始時のコールバック
  onAIAdoptionEnd?: () => void; // AI提案採用終了時のコールバック
  autoApplyNewSuggestion?: boolean; // 新しいAI提案を自動適用するかどうか
}

type EditorMode = 'visual' | 'markdown';

function ArticleEditor({
  draft,
  categories,
  tags,
  suggestion,
  onSave,
  onPublish,
  onSchedulePublish,
  onPreview,
  onGenerateAI,
  onFileProcessed,
  onFileError,
  fileContent,
  isLoading = false,
  onAIAdoptionStart,
  onAIAdoptionEnd,
  autoApplyNewSuggestion = true,
}: ArticleEditorProps) {
  const { config } = useAppStore();
  
  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [article, setArticle] = useState<Partial<DraftArticle>>({
    title: '',
    content: '',
    metaDescription: '',
    categories: [],
    tags: [],
    status: 'draft',
    ...draft,
  });
  const [wordCount, setWordCount] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [additionalInstructions, setAdditionalInstructions] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isAIAdoption, setIsAIAdoption] = useState(false); // AI提案採用中フラグ
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date>(new Date(Date.now() + 60 * 60 * 1000)); // 1時間後をデフォルト
  const [scheduledPosts, setScheduledPosts] = useState<WordPressPost[]>([]);

  // デフォルトプロンプトを取得
  const defaultSystemPrompt = config?.prompts?.system || 'あなたは経験豊富なWebコンテンツライターです。ユーザーが提供する情報を基に、SEOに最適化された質の高い記事提案を行ってください。';

  // 初期プロンプト設定
  useEffect(() => {
    if (!currentPrompt && defaultSystemPrompt) {
      setCurrentPrompt(defaultSystemPrompt);
    }
  }, [defaultSystemPrompt, currentPrompt]);
  
  // AI提案の自動適用
  useEffect(() => {
    if (suggestion && autoApplyNewSuggestion) {
      console.log('Auto-applying new AI suggestion...');
      autoApplySuggestion(suggestion);
    }
  }, [suggestion, autoApplyNewSuggestion]);

  // 自動保存
  useEffect(() => {
    // AI提案採用中は自動保存を無効化
    if (!autoSave || isAIAdoption || (!article.title && !article.content)) return;

    const timer = setTimeout(() => {
      // 現在の記事内容をハッシュ化して比較
      const currentContent = JSON.stringify({
        title: article.title,
        content: article.content,
        metaDescription: article.metaDescription,
        categories: article.categories,
        tags: article.tags
      });
      
      // 最後の保存から内容が変更されている場合のみ保存
      if (lastSavedContent === currentContent) {
        return; // 内容が変更されていない場合は保存しない
      }
      
      onSave(article);
      setLastSaved(new Date());
      setLastSavedContent(currentContent);
    }, 30000); // 30秒後に自動保存

    return () => clearTimeout(timer);
  }, [article, autoSave, onSave, isAIAdoption, lastSavedContent]);

  // AI提案の自動適用（新しいマークダウン形式対応）
  const autoApplySuggestion = (newSuggestion: AISuggestion) => {
    if (!newSuggestion) return;
    
    // タイトルの自動適用
    if (newSuggestion.titles && newSuggestion.titles.length > 0) {
      const suggestedTitle = newSuggestion.titles[0];
      setArticle(prev => ({ ...prev, title: suggestedTitle }));
    }
    
    // メタディスクリプションの自動適用
    if (newSuggestion.metaDescriptions && newSuggestion.metaDescriptions.length > 0) {
      const suggestedMeta = newSuggestion.metaDescriptions[0];
      setArticle(prev => ({ ...prev, metaDescription: suggestedMeta }));
    }
    
    // 記事本文の自動適用
    if (newSuggestion.fullArticle && newSuggestion.fullArticle.mainContent) {
      // マークダウンからHTMLに簡易変換
      const htmlContent = convertMarkdownToHtml(newSuggestion.fullArticle.mainContent);
      setArticle(prev => ({ ...prev, content: htmlContent }));
    }
    
    // カテゴリーとタグの自動適用（新規のみ、IDは後で解決）
    const newCategories = newSuggestion.categories?.new || [];
    const newTags = newSuggestion.tags?.new || [];
    
    // 既存のIDも含める
    const existingCategoryIds = newSuggestion.categories?.existing || [];
    const existingTagIds = newSuggestion.tags?.existing || [];
    
    setArticle(prev => ({
      ...prev,
      categories: [...existingCategoryIds, ...prev.categories || []],
      tags: [...existingTagIds, ...prev.tags || []]
    }));
    
    console.log('AI suggestion auto-applied:', {
      title: newSuggestion.titles[0],
      metaLength: newSuggestion.metaDescriptions[0]?.length,
      contentLength: newSuggestion.fullArticle?.mainContent?.length,
      categoriesCount: newCategories.length,
      tagsCount: newTags.length
    });
  };
  
  // マークダウンからHTMLに簡易変換
  const convertMarkdownToHtml = (markdown: string): string => {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<h[1-6]>|<\/[h1-6]>)(.+)$/gm, '<p>$1</p>')
      .replace(/<p><\/p>/g, '');
  };
  
  // レガシー: AI提案の手動適用（既存のUI要素のため保持）
  const applySuggestion = (field: keyof AISuggestion, index?: number) => {
    if (!suggestion) return;

    switch (field) {
      case 'titles':
        if (typeof index === 'number' && suggestion.titles[index]) {
          setArticle(prev => ({ ...prev, title: suggestion.titles[index] }));
        }
        break;
      case 'metaDescriptions':
        if (typeof index === 'number' && suggestion.metaDescriptions[index]) {
          setArticle(prev => ({ ...prev, metaDescription: suggestion.metaDescriptions[index] }));
        }
        break;
      case 'fullArticle':
        if (suggestion.fullArticle) {
          const htmlContent = convertMarkdownToHtml(suggestion.fullArticle.mainContent);
          setArticle(prev => ({ ...prev, content: htmlContent }));
        }
        break;
      case 'categories':
        setArticle(prev => ({ 
          ...prev, 
          categories: [...suggestion.categories.existing, ...prev.categories || []]
        }));
        break;
      case 'tags':
        setArticle(prev => ({ 
          ...prev, 
          tags: [...suggestion.tags.existing, ...prev.tags || []]
        }));
        break;
      case 'structure':
        // 構成を記事本文として挿入
        const structureContent = suggestion.structure.headings
          .map(h => `<h${h.level}>${h.text}</h${h.level}>\n<p>${h.description}</p>`)
          .join('\n\n');
        setArticle(prev => ({ 
          ...prev, 
          content: prev.content ? `${prev.content}\n\n${structureContent}` : structureContent
        }));
        break;
    }
  };

  const handleInputChange = (field: keyof DraftArticle) => (value: any) => {
    setArticle(prev => ({ ...prev, [field]: value }));
  };

  const isReadyToPublish = () => {
    return article.title && article.content && wordCount > 100;
  };

  // プロンプトリセット機能
  const resetPromptToDefault = () => {
    setCurrentPrompt(defaultSystemPrompt);
  };

  // AI提案生成の処理
  const handleGenerateAI = () => {
    let contextualInput = '';
    
    // 現在の記事状態をコンテキストとして追加
    if (article.title || article.content) {
      contextualInput += `現在の記事状態:\n`;
      if (article.title) {
        contextualInput += `タイトル: ${article.title}\n`;
      }
      if (article.content) {
        const plainContent = article.content.replace(/<[^>]*>/g, '');
        contextualInput += `本文: ${plainContent.substring(0, 500)}${plainContent.length > 500 ? '...' : ''}\n`;
      }
      contextualInput += '\n';
    }
    
    // 追加指示を追加
    if (additionalInstructions.trim()) {
      contextualInput += `追加指示・修正要求:\n${additionalInstructions.trim()}\n\n`;
    }
    
    // ファイルコンテンツ処理
    if (inputMode === 'file' && fileContent) {
      contextualInput += '提供されたファイル内容を分析して、上記の現在の記事状態と追加指示を考慮して記事を改善してください。';
    } else if (!contextualInput.trim()) {
      // 何もない場合はデフォルトメッセージ
      contextualInput = '新しい記事を作成してください。';
    }
    
    if (contextualInput) {
      onGenerateAI(contextualInput, currentPrompt);
    }
  };

  return (
    <Box sx={{ maxWidth: '100%', mx: 'auto', p: 2 }}>
      {/* ヘッダーツールバー */}
      <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h5" component="h1">
              {draft ? '記事編集' : '新規記事作成'}
            </Typography>
            {lastSaved && (
              <Typography variant="caption" color="text.secondary">
                最終保存: {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />}
                label="自動保存"
                sx={{ mr: 2 }}
              />
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={() => onSave(article)}
                disabled={isLoading}
              >
                下書き保存
              </Button>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() => onPreview(article)}
                disabled={isLoading}
              >
                プレビュー
              </Button>
              <Button
                variant="contained"
                startIcon={<PublishIcon />}
                onClick={() => onPublish(article)}
                disabled={!isReadyToPublish() || isLoading}
              >
                投稿
              </Button>
              <Button
                variant="outlined"
                startIcon={<ScheduleIcon />}
                onClick={() => setShowScheduleDialog(true)}
                disabled={!isReadyToPublish() || isLoading}
              >
                予約投稿
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* メインエディタエリア */}
        <Grid item xs={12} lg={8}>
          {/* タイトル */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              label="記事タイトル"
              value={article.title || ''}
              onChange={(e) => handleInputChange('title')(e.target.value)}
              placeholder="魅力的なタイトルを入力..."
              helperText={`${(article.title || '').length}/60文字 (SEO推奨32文字以内)`}
              inputProps={{ maxLength: 60 }}
            />
          </Paper>

          {/* エディタモード切り替え */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button
              variant={editorMode === 'visual' ? 'contained' : 'outlined'}
              onClick={() => setEditorMode('visual')}
            >
              ビジュアル
            </Button>
            <Button
              variant={editorMode === 'markdown' ? 'contained' : 'outlined'}
              onClick={() => setEditorMode('markdown')}
            >
              Markdown
            </Button>
          </Box>

          {/* エディタ */}
          <Box sx={{ mb: 3 }}>
            {editorMode === 'visual' ? (
              <RichTextEditor
                value={article.content || ''}
                onChange={handleInputChange('content')}
                onWordCountChange={setWordCount}
                disabled={isLoading}
              />
            ) : (
              <MarkdownEditor
                value={article.content || ''}
                onChange={handleInputChange('content')}
                onWordCountChange={setWordCount}
                disabled={isLoading}
              />
            )}
          </Box>

          {/* メタディスクリプション */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <TextField
              fullWidth
              label="メタディスクリプション"
              multiline
              rows={3}
              value={article.metaDescription || ''}
              onChange={(e) => handleInputChange('metaDescription')(e.target.value)}
              placeholder="検索結果に表示される説明文（120-160文字推奨）"
              helperText={`${(article.metaDescription || '').length}/160文字`}
              inputProps={{ maxLength: 160 }}
            />
          </Paper>
        </Grid>

        {/* サイドバー */}
        <Grid item xs={12} lg={4}>
          {/* AI提案パネル */}
          {suggestion && (
            <Paper elevation={1} sx={{ mb: 2 }}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AIIcon color="primary" />
                    <Typography>AI提案</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {/* タイトル提案 */}
                  {suggestion.titles.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        タイトル案
                      </Typography>
                      {suggestion.titles.map((title, index) => (
                        <Chip
                          key={index}
                          label={title}
                          onClick={() => applySuggestion('titles', index)}
                          sx={{ m: 0.5, cursor: 'pointer' }}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}

                  {/* メタディスクリプション提案 */}
                  {suggestion.metaDescriptions.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        メタディスクリプション案
                      </Typography>
                      {suggestion.metaDescriptions.map((desc, index) => (
                        <Alert
                          key={index}
                          severity="info"
                          action={
                            <Button size="small" onClick={() => applySuggestion('metaDescriptions', index)}>
                              採用
                            </Button>
                          }
                          sx={{ mb: 1 }}
                        >
                          {desc}
                        </Alert>
                      ))}
                    </Box>
                  )}

                  {/* 記事構成提案 */}
                  {suggestion.structure.headings.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        記事構成案
                      </Typography>
                      <Box sx={{ pl: 1 }}>
                        {suggestion.structure.headings.map((heading, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              H{heading.level}: {heading.text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {heading.description}
                            </Typography>
                          </Box>
                        ))}
                        <Button
                          size="small"
                          onClick={() => applySuggestion('structure')}
                          sx={{ mt: 1 }}
                        >
                          構成を挿入
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {/* 完全記事提案 */}
                  {suggestion.fullArticle && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        完全記事案
                      </Typography>
                      <Alert
                        severity="success"
                        action={
                          <Button size="small" onClick={() => applySuggestion('fullArticle')}>
                            記事に適用
                          </Button>
                        }
                        sx={{ mb: 1 }}
                      >
                        AI生成の完全記事（導入・本文・結論含む）
                      </Alert>
                      <Accordion size="small">
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="caption">プレビュー</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', fontSize: '0.8rem' }}>
                            <strong>導入:</strong><br/>
                            {suggestion.fullArticle.introduction.substring(0, 100)}...
                            <br/><br/>
                            <strong>本文:</strong><br/>
                            {suggestion.fullArticle.mainContent.substring(0, 200)}...
                            <br/><br/>
                            <strong>結論:</strong><br/>
                            {suggestion.fullArticle.conclusion.substring(0, 100)}...
                          </Typography>
                        </AccordionDetails>
                      </Accordion>
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            </Paper>
          )}

          {/* カテゴリー・タグ設定 */}
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              分類設定
            </Typography>

            {/* カテゴリー */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>カテゴリー</InputLabel>
              <Select
                multiple
                value={article.categories || []}
                onChange={(e) => handleInputChange('categories')(e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((value) => {
                      const category = categories.find(cat => cat.id === value);
                      return category ? (
                        <Chip key={value} label={category.name} size="small" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* タグ */}
            <FormControl fullWidth>
              <InputLabel>タグ</InputLabel>
              <Select
                multiple
                value={article.tags || []}
                onChange={(e) => handleInputChange('tags')(e.target.value)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(selected as number[]).map((value) => {
                      const tag = tags.find(t => t.id === value);
                      return tag ? (
                        <Chip key={value} label={tag.name} size="small" />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {tags.map((tag) => (
                  <MenuItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>

          {/* 記事統計 */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              記事統計
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                文字数: {wordCount.toLocaleString()}
              </Typography>
              <Typography variant="body2">
                推定読了時間: {Math.ceil(wordCount / 400)}分
              </Typography>
              <Typography variant="body2">
                SEO評価: {
                  wordCount > 2000 ? '良好' :
                  wordCount > 1000 ? '普通' : '要改善'
                }
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              AI提案生成
            </Typography>

            {/* プロンプト編集セクション */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Button
                  variant={showPromptEditor ? 'contained' : 'outlined'}
                  onClick={() => setShowPromptEditor(!showPromptEditor)}
                  size="small"
                  startIcon={<EditIcon />}
                >
                  プロンプト編集
                </Button>
                <Tooltip title="デフォルトプロンプトに戻す">
                  <span>
                    <IconButton 
                      size="small" 
                      onClick={resetPromptToDefault}
                      disabled={currentPrompt === defaultSystemPrompt}
                    >
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
              
              {showPromptEditor && (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="システムプロンプト"
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder="AIの役割と指示を設定..."
                  size="small"
                  sx={{ mb: 2 }}
                />
              )}
            </Box>

            {/* 追加指示入力 */}
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="追加指示・修正要求"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder="現在の記事をどのように改善したいか、新しい要素を追加したいかなどを指示してください..."
                size="small"
                helperText="現在の記事状態を考慮して改善提案を生成します"
              />
            </Box>

            {/* 入力モード選択 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" display="block" gutterBottom>
                補助データ:
              </Typography>
              <Button
                variant={inputMode === 'text' ? 'contained' : 'outlined'}
                onClick={() => setInputMode('text')}
                size="small"
                sx={{ mr: 1 }}
              >
                テキストのみ
              </Button>
              <Button
                variant={inputMode === 'file' ? 'contained' : 'outlined'}
                onClick={() => setInputMode('file')}
                size="small"
              >
                ファイル使用
              </Button>
            </Box>

            {/* ファイルアップロードモード */}
            {inputMode === 'file' && (
              <Box sx={{ mb: 2 }}>
                <FileUploader
                  onFileProcessed={onFileProcessed}
                  onError={onFileError}
                  disabled={isLoading}
                  maxFiles={1}
                />
                {fileContent && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    ファイル「{fileContent.filename}」が処理済み
                    （{fileContent.content.wordCount}文字）
                  </Alert>
                )}
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              startIcon={<AIIcon />}
              onClick={handleGenerateAI}
              disabled={isLoading}
            >
              {isLoading ? 'AI提案生成中...' : 'AI提案を生成'}
            </Button>
          </Paper>
        </Grid>
      </Grid>

      {/* 予約投稿ダイアログ */}
      <Dialog 
        open={showScheduleDialog} 
        onClose={() => setShowScheduleDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon />
            <Typography variant="h6">予約投稿の設定</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
              <DateTimePicker
                label="投稿予定日時"
                value={scheduleDate}
                onChange={(newValue) => newValue && setScheduleDate(newValue)}
                minDateTime={new Date()}
                ampm={false}
                format="yyyy/MM/dd HH:mm"
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: "normal",
                  },
                }}
              />
            </LocalizationProvider>

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              現在の予約投稿
            </Typography>
            {scheduledPosts.length > 0 ? (
              <List>
                {scheduledPosts.map((post) => (
                  <ListItem key={post.id} divider>
                    <ListItemIcon>
                      <EventIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={post.title.rendered}
                      secondary={`予約日時: ${new Date(post.date).toLocaleString('ja-JP')}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary">
                現在予約投稿はありません
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowScheduleDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onSchedulePublish(article, scheduleDate);
              setShowScheduleDialog(false);
            }}
            disabled={!isReadyToPublish()}
          >
            予約投稿を設定
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ArticleEditor;