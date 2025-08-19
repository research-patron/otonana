import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Paper,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ApproveIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Visibility as PreviewIcon,
  Category as CategoryIcon,
  Tag as TagIcon,
  Description as ContentIcon,
  Title as TitleIcon,
  Close as CloseIcon,
  AutoFixHigh as AIIcon,
} from '@mui/icons-material';
import type { AISuggestion, WordPressCategory, WordPressTag } from '../../types';
import type { FileProcessingResult } from '../../services/fileProcessor';

export interface AIResultDisplayProps {
  suggestion: AISuggestion;
  originalInput: string;
  fileContent?: FileProcessingResult | null;
  categories: WordPressCategory[];
  tags: WordPressTag[];
  onAdoptSuggestion: (selectedTitleIndex: number, selectedMetaDescriptionIndex: number) => void;
  onEditManually: () => void;
  onRegenerateWithPrompt: (prompt: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function AIResultDisplay({
  suggestion,
  originalInput,
  fileContent,
  categories,
  tags,
  onAdoptSuggestion,
  onEditManually,
  onRegenerateWithPrompt,
  onCancel,
  isLoading = false,
}: AIResultDisplayProps) {
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTitle, setSelectedTitle] = useState(0);
  const [selectedMetaDescription, setSelectedMetaDescription] = useState(0);
  const [showFullContent, setShowFullContent] = useState(false);

  const handleRegenerate = () => {
    if (customPrompt.trim()) {
      onRegenerateWithPrompt(customPrompt.trim());
      setShowRegenerateDialog(false);
      setCustomPrompt('');
    }
  };

  const getCategoryName = (id: number) => {
    const category = categories.find(cat => cat.id === id);
    return category ? category.name : `ID: ${id}`;
  };

  const getTagName = (id: number) => {
    const tag = tags.find(t => t.id === id);
    return tag ? tag.name : `ID: ${id}`;
  };

  const getContentPreview = (content: string, maxLength: number = 300) => {
    const plainText = content.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ');
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength) + '...';
  };

  const estimateReadingTime = (content: string) => {
    const wordCount = content.replace(/<[^>]*>/g, '').length;
    return Math.ceil(wordCount / 400); // 日本語の平均読書速度を考慮
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            AI提案結果
          </Typography>
          <Typography variant="body2" color="text.secondary">
            生成された記事提案を確認し、採用または編集してください
          </Typography>
        </Box>
        <IconButton onClick={onCancel} disabled={isLoading}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {/* メインコンテンツ */}
        <Grid item xs={12} lg={8}>
          {/* タイトル提案 */}
          <Card elevation={1} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TitleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">タイトル提案</Typography>
                <Badge badgeContent={suggestion.titles.length} color="primary" sx={{ ml: 2 }} />
              </Box>
              
              <Grid container spacing={2}>
                {suggestion.titles.map((title, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper
                      elevation={selectedTitle === index ? 3 : 0}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedTitle === index}
                      aria-label={`タイトル案 ${index + 1}: ${title}`}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: selectedTitle === index ? 2 : 1,
                        borderColor: selectedTitle === index ? 'primary.main' : 'divider',
                        '&:hover': { borderColor: 'primary.main' },
                        '&:focus': {
                          outline: '2px solid',
                          outlineColor: 'primary.main',
                          outlineOffset: '2px',
                        },
                      }}
                      onClick={() => setSelectedTitle(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedTitle(index);
                        }
                      }}
                    >
                      <Typography variant="body1" fontWeight={selectedTitle === index ? 600 : 400}>
                        {title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {title.length} 文字 • SEO推奨: 32文字以内
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* メタディスクリプション提案 */}
          <Card elevation={1} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ContentIcon sx={{ mr: 1, color: 'secondary.main' }} />
                <Typography variant="h6">メタディスクリプション提案</Typography>
                <Badge badgeContent={suggestion.metaDescriptions.length} color="secondary" sx={{ ml: 2 }} />
              </Box>
              
              <Grid container spacing={2}>
                {suggestion.metaDescriptions.map((desc, index) => (
                  <Grid item xs={12} key={index}>
                    <Paper
                      elevation={selectedMetaDescription === index ? 3 : 0}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selectedMetaDescription === index}
                      aria-label={`メタディスクリプション案 ${index + 1}: ${desc.substring(0, 50)}...`}
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: selectedMetaDescription === index ? 2 : 1,
                        borderColor: selectedMetaDescription === index ? 'secondary.main' : 'divider',
                        '&:hover': { borderColor: 'secondary.main' },
                        '&:focus': {
                          outline: '2px solid',
                          outlineColor: 'secondary.main',
                          outlineOffset: '2px',
                        },
                      }}
                      onClick={() => setSelectedMetaDescription(index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedMetaDescription(index);
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight={selectedMetaDescription === index ? 500 : 400}>
                        {desc}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {desc.length} 文字 • SEO推奨: 120-160文字
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {/* 記事内容プレビュー */}
          {suggestion.fullArticle && (
            <Card elevation={1} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ContentIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">記事内容</Typography>
                  <Chip 
                    label={`読了時間: 約${estimateReadingTime(suggestion.fullArticle.mainContent)}分`} 
                    size="small" 
                    sx={{ ml: 2 }} 
                  />
                </Box>

                {/* 導入部分 */}
                {suggestion.fullArticle.introduction && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="primary.main" gutterBottom>
                      導入
                    </Typography>
                    <Typography variant="body2" sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                      {getContentPreview(suggestion.fullArticle.introduction, 200)}
                    </Typography>
                  </Box>
                )}

                {/* メインコンテンツプレビュー */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="primary.main" gutterBottom>
                    メインコンテンツ
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, mb: 2 }}>
                    {getContentPreview(suggestion.fullArticle.mainContent, showFullContent ? 10000 : 400)}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() => setShowFullContent(!showFullContent)}
                    startIcon={<PreviewIcon />}
                  >
                    {showFullContent ? '短縮表示' : '全体を表示'}
                  </Button>
                </Box>

                {/* 結論部分 */}
                {suggestion.fullArticle.conclusion && (
                  <Box>
                    <Typography variant="subtitle2" color="primary.main" gutterBottom>
                      結論
                    </Typography>
                    <Typography variant="body2" sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                      {getContentPreview(suggestion.fullArticle.conclusion, 200)}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* サイドバー */}
        <Grid item xs={12} lg={4}>
          {/* アクションボタン */}
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                次のアクション
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                AI提案をどのように活用しますか？
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<ApproveIcon />}
                    onClick={() => onAdoptSuggestion(selectedTitle, selectedMetaDescription)}
                    disabled={isLoading}
                  >
                    この提案を採用
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<EditIcon />}
                    onClick={onEditManually}
                    disabled={isLoading}
                  >
                    手動で編集
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<RefreshIcon />}
                    onClick={() => setShowRegenerateDialog(true)}
                    disabled={isLoading}
                    color="secondary"
                  >
                    再生成
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* カテゴリー・タグ提案 */}
          <Card elevation={1} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                分類提案
              </Typography>

              {/* 既存カテゴリー */}
              {suggestion.categories.existing.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CategoryIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2">既存カテゴリー</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {suggestion.categories.existing.map((categoryId) => (
                      <Chip
                        key={categoryId}
                        label={getCategoryName(categoryId)}
                        size="small"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 新規カテゴリー */}
              {suggestion.categories.new.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CategoryIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2">新規カテゴリー（自動作成）</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {suggestion.categories.new.map((categoryName, index) => (
                      <Chip
                        key={index}
                        label={categoryName}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 既存タグ */}
              {suggestion.tags.existing.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TagIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2">既存タグ</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {suggestion.tags.existing.map((tagId) => (
                      <Chip
                        key={tagId}
                        label={getTagName(tagId)}
                        size="small"
                        color="secondary"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* 新規タグ */}
              {suggestion.tags.new.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TagIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2">新規タグ（自動作成）</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {suggestion.tags.new.map((tagName, index) => (
                      <Chip
                        key={index}
                        label={tagName}
                        size="small"
                        variant="outlined"
                        color="secondary"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* 記事構成 */}
          {suggestion.structure.headings.length > 0 && (
            <Card elevation={1}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">記事構成</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {suggestion.structure.headings.map((heading, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Typography variant="caption" color="primary">
                            H{heading.level}
                          </Typography>
                        </ListItemIcon>
                        <ListItemText
                          primary={heading.text}
                          secondary={heading.description}
                          primaryTypographyProps={{ variant: 'body2' }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* 再生成ダイアログ */}
      <Dialog
        open={showRegenerateDialog}
        onClose={() => setShowRegenerateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AIIcon sx={{ mr: 1 }} />
            記事の再生成
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            現在の提案をどのように改善したいか、具体的な指示を入力してください。
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="追加指示・修正要求"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="例：もっとカジュアルなトーンで、具体例を多く含めて、3000文字程度で..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRegenerateDialog(false)}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleRegenerate}
            disabled={!customPrompt.trim() || isLoading}
            startIcon={<RefreshIcon />}
          >
            再生成
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AIResultDisplay;