import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Typography,
  Collapse,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Clear as ClearIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import type { WordPressCategory } from '../../types';
import {
  buildCategoryHierarchy,
  searchCategories,
  ensureParentCategories,
  getCategoryDisplayName,
  type HierarchicalCategory,
} from '../../utils/categoryUtils';

interface HierarchicalCategorySelectorProps {
  categories: WordPressCategory[];
  selectedCategoryIds: number[];
  onChange: (selectedIds: number[]) => void;
  label?: string;
  maxHeight?: number;
  showCount?: boolean;
  disabled?: boolean;
}

interface CategoryItemProps {
  category: HierarchicalCategory;
  selectedIds: number[];
  onToggle: (categoryId: number, checked: boolean) => void;
  searchTerm: string;
}

const CategoryItem = ({ category, selectedIds, onToggle, searchTerm }: CategoryItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSelected = selectedIds.includes(category.id);
  const hasChildren = category.children.length > 0;
  
  // 検索結果がある場合は自動展開
  useEffect(() => {
    if (searchTerm && category.children.length > 0) {
      setIsExpanded(true);
    }
  }, [searchTerm, category.children.length]);

  const handleToggle = () => {
    onToggle(category.id, !isSelected);
  };

  const handleExpand = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const getIndentLevel = () => category.level * 20;

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} style={{ backgroundColor: '#fff59d', fontWeight: 'bold' }}>
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Box>
      <ListItem
        disablePadding
        sx={{ 
          pl: `${getIndentLevel()}px`,
          borderLeft: category.level > 0 ? '1px solid #e0e0e0' : 'none',
          ml: category.level > 0 ? 1 : 0,
        }}
      >
        <ListItemButton 
          onClick={handleToggle}
          dense
          sx={{ 
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Checkbox
              checked={isSelected}
              size="small"
              sx={{ p: 0.5 }}
              onClick={(e) => e.stopPropagation()}
            />
          </ListItemIcon>
          
          <ListItemIcon sx={{ minWidth: 36 }}>
            {hasChildren ? (
              isExpanded ? (
                <FolderOpenIcon color="primary" fontSize="small" />
              ) : (
                <FolderIcon color="action" fontSize="small" />
              )
            ) : (
              <CategoryIcon color="action" fontSize="small" />
            )}
          </ListItemIcon>

          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  {highlightText(category.name, searchTerm)}
                </Typography>
                {category.count > 0 && (
                  <Chip 
                    label={category.count} 
                    size="small" 
                    color="default" 
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                )}
              </Box>
            }
            sx={{ my: 0 }}
          />

          {hasChildren && (
            <IconButton
              size="small"
              onClick={handleExpand}
              sx={{ ml: 1 }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </ListItemButton>
      </ListItem>

      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {category.children.map((child) => (
              <CategoryItem
                key={child.id}
                category={child}
                selectedIds={selectedIds}
                onToggle={onToggle}
                searchTerm={searchTerm}
              />
            ))}
          </List>
        </Collapse>
      )}
    </Box>
  );
};

function HierarchicalCategorySelector({
  categories,
  selectedCategoryIds,
  onChange,
  label = 'カテゴリー',
  maxHeight = 400,
  showCount = true,
  disabled = false,
}: HierarchicalCategorySelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 階層構造を構築
  const hierarchicalCategories = useMemo(() => 
    buildCategoryHierarchy(categories), 
    [categories]
  );

  // 検索結果をフィルタリング
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return hierarchicalCategories;
    return searchCategories(hierarchicalCategories, searchTerm);
  }, [hierarchicalCategories, searchTerm]);

  // 選択されたカテゴリーの表示用チップ
  const selectedCategories = useMemo(() => {
    return categories.filter(cat => selectedCategoryIds.includes(cat.id));
  }, [categories, selectedCategoryIds]);

  const handleCategoryToggle = (categoryId: number, checked: boolean) => {
    if (disabled) return;

    let newSelectedIds: number[];
    
    if (checked) {
      // カテゴリーを選択する場合、親カテゴリーも自動選択
      const idsWithParents = ensureParentCategories([...selectedCategoryIds, categoryId], categories);
      newSelectedIds = idsWithParents;
    } else {
      // カテゴリーの選択を解除する場合
      newSelectedIds = selectedCategoryIds.filter(id => id !== categoryId);
      
      // 子カテゴリーもすべて解除
      const category = categories.find(cat => cat.id === categoryId);
      if (category) {
        const childCategories = categories.filter(cat => {
          // 直接・間接的な子カテゴリーを探す
          let parent = cat.parent;
          while (parent !== 0) {
            if (parent === categoryId) return true;
            const parentCat = categories.find(c => c.id === parent);
            parent = parentCat ? parentCat.parent : 0;
          }
          return false;
        });
        
        childCategories.forEach(child => {
          newSelectedIds = newSelectedIds.filter(id => id !== child.id);
        });
      }
    }
    
    onChange(newSelectedIds);
  };

  const handleSearchClear = () => {
    setSearchTerm('');
  };

  const handleChipDelete = (categoryId: number) => {
    handleCategoryToggle(categoryId, false);
  };

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel shrink>{label}</InputLabel>
      
      <Box sx={{ mt: 3 }}>
        {/* 検索フィールド */}
        <TextField
          fullWidth
          size="small"
          placeholder="カテゴリーを検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            endAdornment: searchTerm && (
              <IconButton size="small" onClick={handleSearchClear}>
                <ClearIcon />
              </IconButton>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* 選択されたカテゴリーのチップ表示 */}
        {selectedCategories.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              選択中のカテゴリー:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {selectedCategories.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  size="small"
                  onDelete={disabled ? undefined : () => handleChipDelete(category.id)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* カテゴリーリスト */}
        <Paper 
          variant="outlined" 
          sx={{ 
            maxHeight, 
            overflow: 'auto',
            backgroundColor: disabled ? 'action.disabledBackground' : 'background.paper'
          }}
        >
          {filteredCategories.length > 0 ? (
            <List dense>
              {filteredCategories.map((category) => (
                <CategoryItem
                  key={category.id}
                  category={category}
                  selectedIds={selectedCategoryIds}
                  onToggle={handleCategoryToggle}
                  searchTerm={searchTerm}
                />
              ))}
            </List>
          ) : searchTerm ? (
            <Alert severity="info" sx={{ m: 2 }}>
              「{searchTerm}」に一致するカテゴリーが見つかりません
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ m: 2 }}>
              カテゴリーがありません
            </Alert>
          )}
        </Paper>

        {/* 統計情報 */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {filteredCategories.length} / {categories.length} カテゴリー
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedCategoryIds.length} 選択中
          </Typography>
        </Box>
      </Box>
    </FormControl>
  );
}

export default HierarchicalCategorySelector;