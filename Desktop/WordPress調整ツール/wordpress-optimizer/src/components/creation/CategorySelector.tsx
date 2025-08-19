import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Alert,
  Paper,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  ArrowForward as NextIcon,
  Category as CategoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import HierarchicalCategorySelector from '../editor/HierarchicalCategorySelector';
import type { WordPressCategory } from '../../types';

interface CategorySelectorProps {
  categories: WordPressCategory[];
  selectedCategoryIds: number[];
  onCategoryChange: (categoryIds: number[]) => void;
  onNext: () => void;
  disabled?: boolean;
  loading?: boolean;
}

function CategorySelector({
  categories,
  selectedCategoryIds,
  onCategoryChange,
  onNext,
  disabled = false,
  loading = false,
}: CategorySelectorProps) {
  const [error, setError] = useState<string | null>(null);

  // 選択されたカテゴリー情報
  const selectedCategories = categories.filter(cat => 
    selectedCategoryIds.includes(cat.id)
  );

  const handleNext = () => {
    if (selectedCategoryIds.length === 0) {
      setError('投稿するカテゴリーを少なくとも1つ選択してください');
      return;
    }
    
    setError(null);
    onNext();
  };

  const canProceed = () => {
    return selectedCategoryIds.length > 0 && !disabled && !loading;
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 2 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <CategoryIcon color="primary" fontSize="large" />
          投稿カテゴリーの選択
        </Typography>
        <Typography variant="body1" color="text.secondary">
          記事を投稿するカテゴリーを選択してください。選択されたカテゴリーの既存記事を分析し、最適な記事提案を行います。
        </Typography>
      </Box>

      {/* メインコンテンツ */}
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CategoryIcon color="primary" />
            カテゴリー一覧
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            複数のカテゴリーを選択可能です。選択されたカテゴリーの記事データを分析してAI提案に活用します。
          </Typography>

          {/* カテゴリー選択UI */}
          <HierarchicalCategorySelector
            categories={categories}
            selectedCategoryIds={selectedCategoryIds}
            onChange={onCategoryChange}
            label="投稿対象カテゴリー"
            maxHeight={400}
            disabled={disabled || loading}
          />

          {/* 選択されたカテゴリーの表示 */}
          {selectedCategories.length > 0 && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" gutterBottom>
                選択されたカテゴリー ({selectedCategories.length}個)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {selectedCategories.map(category => (
                  <Chip
                    key={category.id}
                    label={category.name}
                    color="primary"
                    variant="filled"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </>
          )}
        </CardContent>

        <Divider />

        <CardActions sx={{ p: 3, justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {selectedCategoryIds.length > 0 
              ? `${selectedCategoryIds.length}個のカテゴリーを選択中`
              : 'カテゴリーを選択してください'
            }
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            endIcon={<NextIcon />}
            onClick={handleNext}
            disabled={!canProceed()}
          >
            {loading ? '処理中...' : '次へ（データ分析）'}
          </Button>
        </CardActions>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 情報パネル */}
      <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="info" />
          カテゴリー選択について
        </Typography>
        
        <Stack spacing={2}>
          <Typography variant="body2">
            <strong>• 複数選択可能:</strong> 関連するカテゴリーを複数選択することで、より包括的な記事分析が可能になります
          </Typography>
          <Typography variant="body2">
            <strong>• データ分析:</strong> 選択されたカテゴリーの既存記事タイトル、タグ、メタディスクリプションを分析します
          </Typography>
          <Typography variant="body2">
            <strong>• AI提案最適化:</strong> 既存記事データを基に、SEOに最適化された記事提案を生成します
          </Typography>
          <Typography variant="body2">
            <strong>• 新規カテゴリー:</strong> 最終的な記事作成時は既存カテゴリーから選択されます（新規作成は行いません）
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}

export default CategorySelector;