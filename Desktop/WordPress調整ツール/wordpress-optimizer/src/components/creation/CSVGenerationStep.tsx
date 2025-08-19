import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Chip,
  Stack,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowForward as NextIcon,
  Analytics as AnalyticsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { CSVManagerState, WordPressCategory, WordPressSite } from '../../types';
import { formatDate } from '../../utils/articleDataUtils';

interface CSVGenerationStepProps {
  site: WordPressSite;
  selectedCategories: WordPressCategory[];
  csvState: CSVManagerState | null;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  onForceUpdate: () => void;
  onNext: () => void;
  disabled?: boolean;
}

function CSVGenerationStep({
  site,
  selectedCategories,
  csvState,
  isGenerating,
  error,
  onGenerate,
  onForceUpdate,
  onNext,
  disabled = false,
}: CSVGenerationStepProps) {
  const [progress, setProgress] = useState(0);

  // 進行状況のシミュレーション
  useEffect(() => {
    if (isGenerating) {
      setProgress(0);
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);

      return () => clearInterval(timer);
    } else if (csvState) {
      setProgress(100);
    }
  }, [isGenerating, csvState]);

  const canProceed = () => {
    return csvState && csvState.csvData.length > 0 && !isGenerating && !disabled;
  };

  // CSV統計情報の計算
  const getStatistics = () => {
    if (!csvState) return null;

    const statusCounts = csvState.csvData.reduce((acc, article) => {
      acc[article.status] = (acc[article.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgWordCount = Math.round(
      csvState.csvData.reduce((sum, article) => sum + article.wordCount, 0) / csvState.csvData.length
    );

    return {
      statusCounts,
      avgWordCount,
    };
  };

  const statistics = getStatistics();

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <AnalyticsIcon color="primary" fontSize="large" />
          記事データ分析
        </Typography>
        <Typography variant="body1" color="text.secondary">
          選択されたカテゴリーの既存記事を分析し、AI提案用のデータを準備します
        </Typography>
      </Box>

      {/* メインコンテンツ */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          {/* 対象カテゴリー表示 */}
          <Typography variant="h6" gutterBottom>
            分析対象カテゴリー
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
            {selectedCategories.map(category => (
              <Chip
                key={category.id}
                label={category.name}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>

          <Divider sx={{ my: 3 }} />

          {/* 生成状況 */}
          {isGenerating ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ mb: 3 }} />
              <Typography variant="h6" gutterBottom>
                記事データを分析中...
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                WordPress APIから記事データを取得し、分析用CSVを生成しています
              </Typography>
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={progress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                進捗: {Math.round(progress)}%
              </Typography>
            </Box>
          ) : csvState ? (
            <Box>
              {/* 成功状態 */}
              <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 3 }}>
                <Typography variant="body2" fontWeight="bold">
                  データ分析が完了しました！
                </Typography>
                <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                  最終更新: {formatDate(csvState.lastUpdated, 'relative')}
                </Typography>
              </Alert>

              {/* 統計情報 */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AnalyticsIcon color="primary" />
                      分析結果
                    </Typography>
                    
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">総記事数:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {csvState.totalArticles}記事
                        </Typography>
                      </Box>
                      
                      {statistics && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">平均文字数:</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {statistics.avgWordCount.toLocaleString()}文字
                          </Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2">対象カテゴリー:</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {selectedCategories.length}個
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
                    <Typography variant="h6" gutterBottom>
                      記事ステータス分布
                    </Typography>
                    
                    {statistics && (
                      <Stack spacing={1}>
                        {Object.entries(statistics.statusCounts).map(([status, count]) => (
                          <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">
                              {status === 'publish' ? '公開済み' : 
                               status === 'draft' ? '下書き' : 
                               status === 'private' ? '非公開' : status}:
                            </Typography>
                            <Chip 
                              label={`${count}記事`} 
                              size="small" 
                              color={status === 'publish' ? 'success' : 'default'}
                              variant="outlined"
                            />
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                記事データ分析を開始
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                選択されたカテゴリーの記事データを分析し、AI提案に活用します
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AnalyticsIcon />}
                onClick={onGenerate}
                disabled={disabled}
                size="large"
              >
                データ分析を開始
              </Button>
            </Box>
          )}
        </CardContent>

        {(csvState || error) && (
          <>
            <Divider />
            <CardActions sx={{ p: 3, justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {csvState && (
                  <Tooltip title="データを強制更新">
                    <IconButton
                      onClick={onForceUpdate}
                      disabled={isGenerating || disabled}
                      size="small"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Typography variant="body2" color="text.secondary">
                  {csvState ? `${csvState.totalArticles}記事を分析済み` : ''}
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                size="large"
                endIcon={<NextIcon />}
                onClick={onNext}
                disabled={!canProceed()}
              >
                次へ（記事要求入力）
              </Button>
            </CardActions>
          </>
        )}
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" icon={<ErrorIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            データ分析中にエラーが発生しました
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        </Alert>
      )}

      {/* 情報パネル */}
      <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="info" />
          データ分析について
        </Typography>
        
        <Stack spacing={2}>
          <Typography variant="body2">
            <strong>• 記事情報収集:</strong> 選択されたカテゴリーの記事タイトル、メタディスクリプション、タグを収集します
          </Typography>
          <Typography variant="body2">
            <strong>• SEO分析:</strong> 既存記事のSEO要素を分析し、最適化のための基礎データを作成します
          </Typography>
          <Typography variant="body2">
            <strong>• 差分更新:</strong> 一度生成されたデータは効率的に差分更新され、新規記事の追加・削除に対応します
          </Typography>
          <Typography variant="body2">
            <strong>• AI活用:</strong> 分析されたデータはAI提案生成時に活用され、既存記事との関連性を考慮した記事提案が可能になります
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

export default CSVGenerationStep;