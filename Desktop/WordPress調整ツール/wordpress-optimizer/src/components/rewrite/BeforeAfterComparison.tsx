import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Tabs,
  Tab,
  Grid,
  Paper,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Code as CodeIcon,
  Compare as CompareIcon,
  Info as InfoIcon,
  TrendingUp as ImprovementIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import type { BeforeAfterContent, RewriteSuggestion } from '../../types';

interface BeforeAfterComparisonProps {
  content: BeforeAfterContent;
  rewriteSuggestion?: RewriteSuggestion;
  onContentUpdate?: (updatedContent: BeforeAfterContent) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function BeforeAfterComparison({ 
  content, 
  rewriteSuggestion,
  onContentUpdate 
}: BeforeAfterComparisonProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [showRawContent, setShowRawContent] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{
    type: 'original' | 'suggested' | 'final';
    field: 'title' | 'content' | 'metaDescription';
    text: string;
  } | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // ここでスナックバーやトーストで成功通知を表示することもできる
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const renderContentComparison = (
    title: string,
    originalText: string,
    suggestedText: string,
    finalText?: string
  ) => {
    const hasChanges = originalText !== suggestedText;
    const finalContent = finalText || suggestedText;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {title}
          {hasChanges && (
            <Chip 
              size="small" 
              label="変更あり" 
              color="primary" 
              variant="outlined" 
            />
          )}
        </Typography>
        
        <Grid container spacing={2}>
          {/* 元のコンテンツ */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%', minHeight: 150 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                変更前
              </Typography>
              <Box sx={{ 
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
                p: 1,
                bgcolor: hasChanges ? 'error.light' : 'grey.50',
                opacity: hasChanges ? 0.7 : 1
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: hasChanges ? 'error.dark' : 'text.primary'
                  }}
                >
                  {originalText || '(空)'}
                </Typography>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Tooltip title="コピー">
                  <IconButton 
                    size="small" 
                    onClick={() => handleCopyToClipboard(originalText)}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button 
                  size="small" 
                  onClick={() => setSelectedContent({ 
                    type: 'original', 
                    field: title.toLowerCase() as any, 
                    text: originalText 
                  })}
                >
                  詳細表示
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* 提案されたコンテンツ */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%', minHeight: 150 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                提案内容
              </Typography>
              <Box sx={{ 
                border: '1px solid',
                borderColor: 'success.main',
                borderRadius: 1,
                p: 1,
                bgcolor: hasChanges ? 'success.light' : 'grey.50'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: hasChanges ? 'success.dark' : 'text.primary'
                  }}
                >
                  {suggestedText || '(空)'}
                </Typography>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Tooltip title="コピー">
                  <IconButton 
                    size="small" 
                    onClick={() => handleCopyToClipboard(suggestedText)}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button 
                  size="small" 
                  onClick={() => setSelectedContent({ 
                    type: 'suggested', 
                    field: title.toLowerCase() as any, 
                    text: suggestedText 
                  })}
                >
                  詳細表示
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* 最終的なコンテンツ */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '100%', minHeight: 150 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                最終版
              </Typography>
              <Box sx={{ 
                border: '1px solid',
                borderColor: 'primary.main',
                borderRadius: 1,
                p: 1,
                bgcolor: 'primary.light'
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: 'primary.dark',
                    fontWeight: 'medium'
                  }}
                >
                  {finalContent || '(空)'}
                </Typography>
              </Box>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Tooltip title="コピー">
                  <IconButton 
                    size="small" 
                    onClick={() => handleCopyToClipboard(finalContent)}
                  >
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button 
                  size="small" 
                  onClick={() => setSelectedContent({ 
                    type: 'final', 
                    field: title.toLowerCase() as any, 
                    text: finalContent 
                  })}
                >
                  詳細表示
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* 変更統計の表示 */}
        {hasChanges && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
            <Typography variant="caption" color="info.dark">
              文字数変化: {originalText.length} → {finalContent.length} 
              ({finalContent.length - originalText.length >= 0 ? '+' : ''}{finalContent.length - originalText.length})
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const renderStatistics = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        改善統計
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {content.changes.totalSuggestions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                総提案数
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {content.changes.approvedSuggestions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                承認済み
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {content.changes.modifiedSuggestions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                カスタム修正
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {content.changes.rejectedSuggestions}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                却下
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3 }}>
        <Alert 
          severity="info" 
          icon={<ImprovementIcon />}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Box>
            <Typography variant="body2" gutterBottom>
              <strong>予想改善スコア: {content.changes.estimatedImprovementScore}点</strong>
            </Typography>
            <Typography variant="caption">
              承認された提案により、記事品質の向上が期待されます。
            </Typography>
          </Box>
        </Alert>
      </Box>
    </Box>
  );

  const final = content.final || content.suggested;

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareIcon />
          記事改善の比較プレビュー
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          記事ID: {content.postId} | 記事タイトル: {content.original.title}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              label="比較表示" 
              icon={<CompareIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="統計情報" 
              icon={<InfoIcon />} 
              iconPosition="start"
            />
            <Tab 
              label="RAWデータ" 
              icon={<CodeIcon />} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderContentComparison('タイトル', content.original.title, content.suggested.title, final.title)}
          <Divider sx={{ my: 3 }} />
          {renderContentComparison('メタディスクリプション', content.original.metaDescription, content.suggested.metaDescription, final.metaDescription)}
          <Divider sx={{ my: 3 }} />
          {renderContentComparison('本文コンテンツ', content.original.content, content.suggested.content, final.content)}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderStatistics()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box>
            <Typography variant="h6" gutterBottom>
              RAWデータ表示
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  元データ（JSON）
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {JSON.stringify(content.original, null, 2)}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  修正後データ（JSON）
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {JSON.stringify(final, null, 2)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
            
            {rewriteSuggestion && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  リライト提案データ（JSON）
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50', maxHeight: 300, overflow: 'auto' }}>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {JSON.stringify(rewriteSuggestion, null, 2)}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* 詳細表示ダイアログ */}
        <Dialog
          open={!!selectedContent}
          onClose={() => setSelectedContent(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {selectedContent?.field} - {selectedContent?.type === 'original' ? '変更前' : 
             selectedContent?.type === 'suggested' ? '提案内容' : '最終版'}
          </DialogTitle>
          <DialogContent>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography 
                variant="body2" 
                component="pre" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace'
                }}
              >
                {selectedContent?.text || '(空)'}
              </Typography>
            </Paper>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={() => handleCopyToClipboard(selectedContent?.text || '')}
              >
                クリップボードにコピー
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedContent(null)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}