import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Analytics as AnalyticsIcon,
  Category as CategoryIcon,
  Article as ArticleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import HierarchicalCategorySelector from '../editor/HierarchicalCategorySelector';
import type { WordPressSite, WordPressCategory, CSVManagerState } from '../../types';
import csvManager from '../../services/csvManager';
import { formatDate, getStatusLabel, getStatusColor } from '../../utils/articleDataUtils';

interface CategoryTargetSelectorProps {
  site: WordPressSite;
  categories: WordPressCategory[];
  selectedCategoryIds: number[];
  onCategoryChange: (categoryIds: number[]) => void;
  onCSVUpdate: (csvState: CSVManagerState) => void;
  disabled?: boolean;
}

function CategoryTargetSelector({
  site,
  categories,
  selectedCategoryIds,
  onCategoryChange,
  onCSVUpdate,
  disabled = false,
}: CategoryTargetSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [csvState, setCsvState] = useState<CSVManagerState | null>(null);
  const [includeStatuses, setIncludeStatuses] = useState<
    Array<'publish' | 'draft' | 'private' | 'pending' | 'future'>
  >(['publish']);
  const [error, setError] = useState<string | null>(null);

  // 既存のCSV状態を読み込み
  useEffect(() => {
    const existingState = csvManager.getCSVState(site.id);
    if (existingState) {
      setCsvState(existingState);
      onCategoryChange(existingState.selectedCategoryIds);
      setIncludeStatuses(existingState.includeStatuses);
    }
  }, [site.id]);

  // 選択されたカテゴリー情報
  const selectedCategories = useMemo(() => {
    return categories.filter(cat => selectedCategoryIds.includes(cat.id));
  }, [categories, selectedCategoryIds]);

  // カテゴリー別記事数統計
  const categoryStats = useMemo(() => {
    if (!csvState) return {};
    
    const stats: Record<string, number> = {};
    csvState.csvData.forEach(article => {
      article.categories.forEach(category => {
        stats[category.name] = (stats[category.name] || 0) + 1;
      });
    });
    return stats;
  }, [csvState]);

  // ステータス別統計
  const statusStats = useMemo(() => {
    if (!csvState) return {};
    
    const stats: Record<string, number> = {};
    csvState.csvData.forEach(article => {
      stats[article.status] = (stats[article.status] || 0) + 1;
    });
    return stats;
  }, [csvState]);

  // CSV更新処理
  const handleUpdateCSV = async (forceFullUpdate: boolean = false) => {
    if (selectedCategoryIds.length === 0) {
      setError('カテゴリーを選択してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const updatedState = await csvManager.updateCSVData(
        site,
        selectedCategoryIds,
        includeStatuses,
        forceFullUpdate
      );
      
      setCsvState(updatedState);
      onCSVUpdate(updatedState);
      
      console.log(`CSV updated: ${updatedState.totalArticles} articles`);
    } catch (error) {
      console.error('CSV update failed:', error);
      setError(error instanceof Error ? error.message : 'CSV更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ステータス選択の変更
  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...includeStatuses, status as any]
      : includeStatuses.filter(s => s !== status);
    
    setIncludeStatuses(newStatuses);
  };

  // CSVエクスポート
  const handleExportCSV = () => {
    if (!csvState || csvState.csvData.length === 0) {
      setError('エクスポートするデータがありません');
      return;
    }

    try {
      const filename = `${site.url.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9]/g, '_')}_articles_${new Date().toISOString().split('T')[0]}.csv`;
      csvManager.exportAsCSV(csvState.csvData, filename);
    } catch (error) {
      console.error('CSV export failed:', error);
      setError('CSVエクスポートに失敗しました');
    }
  };

  return (
    <Box sx={{ space: 3 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon color="primary" />
            カテゴリー選択とCSV管理
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Tooltip title="CSV強制更新">
              <IconButton
                onClick={() => handleUpdateCSV(true)}
                disabled={isLoading || disabled || selectedCategoryIds.length === 0}
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="CSVエクスポート">
              <IconButton
                onClick={handleExportCSV}
                disabled={!csvState || csvState.csvData.length === 0}
                color="secondary"
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* CSV状態表示 */}
        {csvState && (
          <Alert severity="info" sx={{ mb: 2 }}>
            最終更新: {formatDate(csvState.lastUpdated, 'relative')} | 
            総記事数: {csvState.totalArticles}記事 | 
            対象カテゴリー: {csvState.selectedCategoryIds.length}個
          </Alert>
        )}
      </Paper>

      <Grid container spacing={3}>
        {/* カテゴリー選択 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              対象カテゴリーの選択
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              CSV生成対象となるカテゴリーを選択してください
            </Typography>
            
            <HierarchicalCategorySelector
              categories={categories}
              selectedCategoryIds={selectedCategoryIds}
              onChange={onCategoryChange}
              label="対象カテゴリー"
              maxHeight={300}
              disabled={disabled}
            />

            {/* 記事ステータス選択 */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                対象記事ステータス
              </Typography>
              <FormGroup row>
                {[
                  { value: 'publish', label: '公開済み' },
                  { value: 'draft', label: '下書き' },
                  { value: 'private', label: '非公開' },
                  { value: 'pending', label: '承認待ち' },
                  { value: 'future', label: '予約投稿' },
                ].map(({ value, label }) => (
                  <FormControlLabel
                    key={value}
                    control={
                      <Checkbox
                        checked={includeStatuses.includes(value as any)}
                        onChange={(e) => handleStatusChange(value, e.target.checked)}
                        disabled={disabled}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>
            </Box>

            {/* CSV更新ボタン */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => handleUpdateCSV(false)}
                disabled={isLoading || disabled || selectedCategoryIds.length === 0}
                startIcon={isLoading ? <CircularProgress size={16} /> : <AnalyticsIcon />}
              >
                {isLoading ? 'CSV更新中...' : 'CSV更新（増分）'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={() => handleUpdateCSV(true)}
                disabled={isLoading || disabled || selectedCategoryIds.length === 0}
                startIcon={<RefreshIcon />}
              >
                全体更新
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* 統計情報 */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            {/* 選択カテゴリー情報 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon color="primary" />
                  選択中カテゴリー
                </Typography>
                
                {selectedCategories.length > 0 ? (
                  <Stack spacing={1}>
                    {selectedCategories.map(category => (
                      <Box key={category.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">{category.name}</Typography>
                        <Chip 
                          label={`${categoryStats[category.name] || 0}記事`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    カテゴリーが選択されていません
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* CSV状態 */}
            {csvState && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArticleIcon color="primary" />
                    CSV記事データ
                  </Typography>
                  
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">総記事数:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {csvState.totalArticles}記事
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">最終更新:</Typography>
                      <Typography variant="body2">
                        {formatDate(csvState.lastUpdated, 'relative')}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      ステータス別
                    </Typography>
                    {Object.entries(statusStats).map(([status, count]) => (
                      <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          label={getStatusLabel(status)} 
                          size="small" 
                          color={getStatusColor(status)}
                          variant="outlined"
                        />
                        <Typography variant="body2">{count}記事</Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            {/* 更新情報 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  更新情報
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  CSVデータは記事の追加・削除・更新に応じて増分更新されます。
                  大幅な変更があった場合は「全体更新」をお試しください。
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CategoryTargetSelector;