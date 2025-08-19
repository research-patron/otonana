import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Stack,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Upload as UploadIcon,
  Analytics as AnalyticsIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import FileUploader from '../editor/FileUploader';
import AIResultDisplay from '../creation/AIResultDisplay';
import type {
  ArticleCSVData,
  UltrathinkAIRequest,
  UltrathinkAIResponse,
  PromptTemplate,
  WordPressCategory,
  WordPressSite,
} from '../../types';
import { generateUltrathinkAISuggestion } from '../../services/ultrathinkAI';
import { processFile } from '../../services/fileProcessor';
import { useAppStore } from '../../store';

interface UltrathinkPromptProps {
  site: WordPressSite;
  csvData: ArticleCSVData[];
  selectedCategories: WordPressCategory[];
  disabled?: boolean;
}

function UltrathinkPrompt({
  site,
  csvData,
  selectedCategories,
  disabled = false,
}: UltrathinkPromptProps) {
  const { config } = useAppStore();
  const [userInput, setUserInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<{
    text: string;
    filename: string;
    wordCount: number;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<UltrathinkAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // プロンプトテンプレート一覧
  const promptTemplates = config?.prompts.templates || [];

  // ファイル処理
  const handleFileUpload = async (file: File) => {
    try {
      setUploadedFile(file);
      const processed = await processFile(file);
      setFileContent({
        text: processed.text,
        filename: file.name,
        wordCount: processed.text.length,
      });
    } catch (error) {
      console.error('File processing failed:', error);
      setError('ファイルの処理に失敗しました');
    }
  };

  // ファイル削除
  const handleFileRemove = () => {
    setUploadedFile(null);
    setFileContent(null);
  };

  // AI提案生成
  const handleGenerateAISuggestion = async () => {
    if (!userInput.trim()) {
      setError('記事のアイデアまたは要求を入力してください');
      return;
    }

    if (csvData.length === 0) {
      setError('CSVデータが読み込まれていません。先にカテゴリーを選択してCSVを更新してください');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setAiResponse(null);

    try {
      const request: UltrathinkAIRequest = {
        userInput,
        csvData,
        selectedCategories,
        fileContent,
        promptTemplate: selectedTemplate,
        analysisContext: {
          competitorAnalysis: competitorAnalysis.trim() || undefined,
          targetKeywords: targetKeywords
            .split(',')
            .map(k => k.trim())
            .filter(k => k.length > 0),
        },
      };

      const apiKey = config.geminiApiKey;
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
      }

      const response = await generateUltrathinkAISuggestion(apiKey, request);
      setAiResponse(response);
    } catch (error) {
      console.error('AI suggestion generation failed:', error);
      setError(error instanceof Error ? error.message : 'AI提案の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  // CSV分析サマリー
  const csvSummary = csvData.length > 0 ? {
    totalArticles: csvData.length,
    categories: [...new Set(csvData.flatMap(article => article.categories.map(cat => cat.name)))],
    averageWordCount: Math.round(csvData.reduce((sum, article) => sum + article.wordCount, 0) / csvData.length),
  } : null;

  return (
    <Box sx={{ space: 3 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <PsychologyIcon color="primary" />
          Ultrathink AI提案
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          既存記事データベースを活用して、戦略的なSEO記事提案を生成します
        </Typography>

        {/* CSV分析サマリー */}
        {csvSummary && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              分析対象データ: {csvSummary.totalArticles}記事 | 
              平均文字数: {csvSummary.averageWordCount}文字 | 
              カテゴリー: {csvSummary.categories.slice(0, 3).join(', ')}
              {csvSummary.categories.length > 3 && ` 他${csvSummary.categories.length - 3}個`}
            </Typography>
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* 入力フォーム */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>
            {/* メイン入力 */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                記事のアイデア・要求
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="例：
• IT業界の最新トレンドについて詳しく解説したい
• 初心者向けのPythonプログラミングガイドを作成したい
• 自社サービスの競合優位性を示す記事が欲しい
• 〇〇というキーワードで上位表示を狙いたい

詳細な要求があればお書きください..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={disabled || isGenerating}
              />
            </Paper>

            {/* ファイルアップロード */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UploadIcon />
                参考ファイル（オプション）
              </Typography>
              
              {!fileContent ? (
                <FileUploader
                  onFileUpload={handleFileUpload}
                  disabled={disabled || isGenerating}
                  accept=".txt,.md,.docx,.pdf"
                  maxSize={10 * 1024 * 1024} // 10MB
                />
              ) : (
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2">{fileContent.filename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {fileContent.wordCount}文字
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        onClick={handleFileRemove}
                        disabled={disabled || isGenerating}
                      >
                        削除
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Paper>

            {/* 高度な設定 */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">高度な設定</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={3}>
                  {/* プロンプトテンプレート */}
                  <FormControl fullWidth>
                    <InputLabel>プロンプトテンプレート</InputLabel>
                    <Select
                      value={selectedTemplate?.id || ''}
                      onChange={(e) => {
                        const template = promptTemplates.find(t => t.id === e.target.value);
                        setSelectedTemplate(template || null);
                      }}
                      label="プロンプトテンプレート"
                      disabled={disabled || isGenerating}
                    >
                      <MenuItem value="">デフォルト</MenuItem>
                      {promptTemplates.map(template => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* 競合分析 */}
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="競合分析情報"
                    placeholder="競合他社の記事や戦略について分析した情報があれば入力してください..."
                    value={competitorAnalysis}
                    onChange={(e) => setCompetitorAnalysis(e.target.value)}
                    disabled={disabled || isGenerating}
                    helperText="競合サイトの強み・弱み、差別化ポイントなどを記載"
                  />

                  {/* ターゲットキーワード */}
                  <TextField
                    fullWidth
                    label="ターゲットキーワード"
                    placeholder="SEO対象キーワードをカンマ区切りで入力..."
                    value={targetKeywords}
                    onChange={(e) => setTargetKeywords(e.target.value)}
                    disabled={disabled || isGenerating}
                    helperText="例: AI, 機械学習, プログラミング"
                  />
                </Stack>
              </AccordionDetails>
            </Accordion>

            {/* AI提案実行ボタン */}
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerateAISuggestion}
              disabled={disabled || isGenerating || !userInput.trim() || csvData.length === 0}
              startIcon={isGenerating ? <CircularProgress size={20} /> : <LightbulbIcon />}
              sx={{ py: 1.5 }}
            >
              {isGenerating ? 'AI提案生成中...' : 'Ultrathink AI提案を生成'}
            </Button>
          </Stack>
        </Grid>

        {/* サイドバー */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* CSV分析状況 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AnalyticsIcon color="primary" />
                  分析データ状況
                </Typography>
                
                {csvData.length > 0 ? (
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">分析記事数:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {csvData.length}記事
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">対象カテゴリー:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {selectedCategories.length}個
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="caption" color="text.secondary">
                      これらのデータを基に、既存記事との相乗効果を考慮した戦略的記事提案を生成します
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    カテゴリーを選択してCSVデータを生成してください
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* 選択中のテンプレート */}
            {selectedTemplate && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    選択中テンプレート
                  </Typography>
                  <Typography variant="subtitle2" gutterBottom>
                    {selectedTemplate.name}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip label={selectedTemplate.tone} size="small" color="primary" />
                    <Chip label={`SEO重視度: ${selectedTemplate.seoFocus}/10`} size="small" color="secondary" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {selectedTemplate.targetAudience}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* ヒント */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="primary" />
                  効果的な使い方
                </Typography>
                
                <Stack spacing={1}>
                  <Typography variant="body2">
                    • 具体的な要求を明確に記述
                  </Typography>
                  <Typography variant="body2">
                    • ターゲット読者層を意識
                  </Typography>
                  <Typography variant="body2">
                    • 既存記事との差別化ポイントを考慮
                  </Typography>
                  <Typography variant="body2">
                    • 参考ファイルで詳細な情報を補完
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mt: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 生成中プログレス */}
      {isGenerating && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            AI提案生成中...
          </Typography>
          <LinearProgress sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            既存記事データベースを分析し、最適化された記事提案を生成しています
          </Typography>
        </Paper>
      )}

      {/* AI提案結果 */}
      {aiResponse && (
        <Paper sx={{ mt: 3 }}>
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Ultrathink AI提案結果
            </Typography>
            
            {/* CSV分析サマリー */}
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold">
                分析完了: {aiResponse.csvAnalysis.totalArticlesAnalyzed}記事を分析 | 
                コンテンツギャップ: {aiResponse.csvAnalysis.contentGaps.length}個特定 | 
                推奨カテゴリー: {aiResponse.csvAnalysis.recommendedCategories.length}個
              </Typography>
            </Alert>
          </Box>
          
          <AIResultDisplay
            suggestion={aiResponse}
            onCreateDraft={(draftData) => {
              console.log('Creating draft from Ultrathink AI suggestion:', draftData);
              // ドラフト作成処理
            }}
          />
        </Paper>
      )}
    </Box>
  );
}

export default UltrathinkPrompt;