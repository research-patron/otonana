import { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
  TextField,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AutoFixHigh as AIIcon,
  Edit as EditIcon,
  Publish as PublishIcon,
  Refresh as RefreshIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import type { AISuggestion, WordPressCategory, WordPressTag } from '../../types';
import type { FileProcessingResult } from '../../services/fileProcessor';

interface AIResultReviewProps {
  originalInput: string;
  fileContent?: FileProcessingResult | null;
  suggestion: AISuggestion;
  categories: WordPressCategory[];
  tags: WordPressTag[];
  onAdoptSuggestion: () => void;
  onEditManually: () => void;
  onRegenerateWithPrompt: (newPrompt: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function AIResultReview({
  originalInput,
  fileContent,
  suggestion,
  categories,
  tags,
  onAdoptSuggestion,
  onEditManually,
  onRegenerateWithPrompt,
  onCancel,
  isLoading = false,
}: AIResultReviewProps) {
  const [newPrompt, setNewPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  // 提案されたタイトルの最初の項目を取得
  const suggestedTitle = suggestion.titles[0] || '無題の記事';
  
  // 提案されたメタディスクリプションの最初の項目を取得
  const suggestedMetaDescription = suggestion.metaDescriptions[0] || '';

  // 完全記事の構築
  const fullArticleContent = suggestion.fullArticle 
    ? `${suggestion.fullArticle.introduction}\n\n${suggestion.fullArticle.mainContent}\n\n${suggestion.fullArticle.conclusion}`
    : '';

  // カテゴリー名の解決
  const getCategoryNames = (categoryIds: number[]) => {
    return categoryIds.map(id => {
      const category = categories.find(cat => cat.id === id);
      return category?.name || `ID: ${id}`;
    });
  };

  // タグ名の解決
  const getTagNames = (tagIds: number[]) => {
    return tagIds.map(id => {
      const tag = tags.find(t => t.id === id);
      return tag?.name || `ID: ${id}`;
    });
  };

  // テキストをクリップボードにコピー
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 新しいプロンプトでの再生成
  const handleRegenerate = () => {
    if (newPrompt.trim()) {
      onRegenerateWithPrompt(newPrompt.trim());
      setNewPrompt('');
      setShowPromptInput(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={onCancel} color="primary">
            <ArrowBackIcon />
          </IconButton>
          <AIIcon color="primary" />
          <Typography variant="h4" component="h1">
            AI提案結果の確認
          </Typography>
        </Box>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          左側に元の入力内容、右側にAI提案された記事内容を表示しています。
          提案内容を確認して、次のアクションを選択してください。
        </Alert>
      </Box>

      {/* メインコンテンツ - 左右分割 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 左側: 元の入力内容 */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" gutterBottom>
                元の入力内容
              </Typography>
            </Box>
            <Box sx={{ p: 2, maxHeight: '600px', overflow: 'auto' }}>
              {fileContent ? (
                <>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    📄 ファイル: {fileContent.filename}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    文字数: {fileContent.content.wordCount.toLocaleString()}文字
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f5f5f5',
                      p: 2,
                      borderRadius: 1,
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {fileContent.content.text.substring(0, 2000)}
                    {fileContent.content.text.length > 2000 && '\n\n...(省略)'}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    ✏️ 直接入力
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      backgroundColor: '#f5f5f5',
                      p: 2,
                      borderRadius: 1,
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                    }}
                  >
                    {originalInput || '（入力内容なし）'}
                  </Typography>
                </>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* 右側: AI提案内容 */}
        <Grid item xs={12} lg={6}>
          <Paper elevation={2} sx={{ height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">
                  AI提案された記事内容
                </Typography>
                <Tooltip title="内容をコピー">
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(fullArticleContent)}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ p: 2, maxHeight: '600px', overflow: 'auto' }}>
              {/* 提案されたタイトル */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    📝 タイトル
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {suggestedTitle}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({suggestedTitle.length}/60文字)
                  </Typography>
                </CardContent>
              </Card>

              {/* メタディスクリプション */}
              {suggestedMetaDescription && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      📄 メタディスクリプション
                    </Typography>
                    <Typography variant="body2">
                      {suggestedMetaDescription}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({suggestedMetaDescription.length}/160文字)
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* カテゴリーとタグ */}
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    🏷️ カテゴリー・タグ
                  </Typography>
                  
                  {/* 既存カテゴリー */}
                  {suggestion.categories.existing.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" display="block" gutterBottom>
                        既存カテゴリー:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {getCategoryNames(suggestion.categories.existing).map((name, index) => (
                          <Chip key={index} label={name} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* 新規カテゴリー */}
                  {suggestion.categories.new.length > 0 && (
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="caption" display="block" gutterBottom>
                        新規カテゴリー:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {suggestion.categories.new.map((name, index) => (
                          <Chip key={index} label={name} size="small" color="success" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* タグ */}
                  {(suggestion.tags.existing.length > 0 || suggestion.tags.new.length > 0) && (
                    <Box>
                      <Typography variant="caption" display="block" gutterBottom>
                        タグ:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {getTagNames(suggestion.tags.existing).map((name, index) => (
                          <Chip key={`existing-${index}`} label={name} size="small" variant="outlined" />
                        ))}
                        {suggestion.tags.new.map((name, index) => (
                          <Chip key={`new-${index}`} label={name} size="small" color="info" />
                        ))}
                      </Box>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* 記事本文 */}
              {fullArticleContent && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      📖 記事本文
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.7,
                        fontSize: '0.9rem',
                      }}
                    >
                      {fullArticleContent}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      文字数: {fullArticleContent.length.toLocaleString()}文字
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* 記事構成 */}
              {suggestion.structure.headings.length > 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      📋 記事構成
                    </Typography>
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
                  </CardContent>
                </Card>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* アクションボタン */}
      <Paper elevation={1} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          次のアクションを選択してください
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              startIcon={<PublishIcon />}
              onClick={onAdoptSuggestion}
              disabled={isLoading}
              size="large"
            >
              提案を採用して投稿
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onEditManually}
              disabled={isLoading}
              size="large"
            >
              手動で編集
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => setShowPromptInput(!showPromptInput)}
              disabled={isLoading}
              size="large"
            >
              新しいプロンプトで再提案
            </Button>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={onCancel}
              disabled={isLoading}
              size="large"
            >
              キャンセル
            </Button>
          </Grid>
        </Grid>

        {/* 新しいプロンプト入力エリア */}
        {showPromptInput && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              新しいプロンプトを入力してください
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="例: より技術的な内容で、専門用語を多用して記事を作成してください..."
                disabled={isLoading}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={handleRegenerate}
                  disabled={!newPrompt.trim() || isLoading}
                  startIcon={<AIIcon />}
                >
                  再生成
                </Button>
                <Button
                  variant="text"
                  onClick={() => {
                    setShowPromptInput(false);
                    setNewPrompt('');
                  }}
                  disabled={isLoading}
                >
                  キャンセル
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default AIResultReview;