import { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Autocomplete,
  Chip,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import {
  Search as SearchIcon,
  LocalOffer as TagIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import type { WordPressTag } from '../../types';
import { searchTags, findTagByName } from '../../utils/categoryUtils';

interface SearchableTagSelectorProps {
  tags: WordPressTag[];
  selectedTagIds: number[];
  onChange: (selectedIds: number[]) => void;
  onCreateNewTag?: (tagName: string) => Promise<WordPressTag>;
  label?: string;
  maxHeight?: number;
  placeholder?: string;
  allowCreate?: boolean;
  maxSelection?: number;
  disabled?: boolean;
  showCount?: boolean;
}

interface TagOption {
  id: number | string;
  name: string;
  count?: number;
  isNew?: boolean;
}

function SearchableTagSelector({
  tags,
  selectedTagIds,
  onChange,
  onCreateNewTag,
  label = 'タグ',
  maxHeight = 300,
  placeholder = 'タグを検索または新規作成...',
  allowCreate = true,
  maxSelection,
  disabled = false,
  showCount = true,
}: SearchableTagSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 選択されたタグ
  const selectedTags = useMemo(() => {
    return tags.filter(tag => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  // 検索結果をフィルタリング
  const filteredTags = useMemo(() => {
    if (!searchTerm.trim()) return tags;
    return searchTags(tags, searchTerm);
  }, [tags, searchTerm]);

  // 新規作成候補の判定
  const canCreateNew = useMemo(() => {
    if (!allowCreate || !searchTerm.trim() || disabled) return false;
    
    const existingTag = findTagByName(tags, searchTerm.trim());
    return !existingTag && searchTerm.trim().length >= 2;
  }, [allowCreate, searchTerm, tags, disabled]);

  // オートコンプリート用オプション
  const options: TagOption[] = useMemo(() => {
    const tagOptions: TagOption[] = filteredTags.map(tag => ({
      id: tag.id,
      name: tag.name,
      count: showCount ? tag.count : undefined,
      isNew: false,
    }));

    // 新規作成オプションを追加
    if (canCreateNew) {
      tagOptions.unshift({
        id: `new-${searchTerm}`,
        name: searchTerm.trim(),
        isNew: true,
      });
    }

    return tagOptions;
  }, [filteredTags, canCreateNew, searchTerm, showCount]);

  const handleTagToggle = (tagId: number) => {
    if (disabled) return;

    const newSelectedIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];

    onChange(newSelectedIds);
  };

  const handleCreateNewTag = async (tagName: string) => {
    if (!onCreateNewTag || disabled) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateNewTag(tagName);
      const newSelectedIds = [...selectedTagIds, newTag.id];
      onChange(newSelectedIds);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to create new tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAutocompleteChange = (event: any, value: TagOption | null) => {
    if (!value) return;

    if (value.isNew && typeof value.id === 'string') {
      handleCreateNewTag(value.name);
    } else if (typeof value.id === 'number') {
      handleTagToggle(value.id);
    }
  };

  const getOptionLabel = (option: TagOption) => {
    if (option.isNew) {
      return `新規作成: ${option.name}`;
    }
    return showCount ? `${option.name} (${option.count})` : option.name;
  };

  const renderOption = (props: any, option: TagOption) => (
    <li {...props}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
        {option.isNew ? (
          <AddIcon color="primary" fontSize="small" />
        ) : (
          <TagIcon color="action" fontSize="small" />
        )}
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography 
            variant="body2" 
            color={option.isNew ? 'primary' : 'text.primary'}
            fontWeight={option.isNew ? 'medium' : 'normal'}
          >
            {option.name}
          </Typography>
          {option.isNew && (
            <Typography variant="caption" color="text.secondary">
              新しいタグとして作成
            </Typography>
          )}
        </Box>

        {!option.isNew && showCount && option.count !== undefined && (
          <Chip 
            label={option.count} 
            size="small" 
            variant="outlined" 
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        )}

        {!option.isNew && typeof option.id === 'number' && (
          <Checkbox
            size="small"
            checked={selectedTagIds.includes(option.id)}
            disabled={disabled}
          />
        )}
      </Box>
    </li>
  );

  const handleChipDelete = (tagId: number) => {
    if (disabled) return;
    handleTagToggle(tagId);
  };

  return (
    <FormControl fullWidth disabled={disabled}>
      <InputLabel shrink>{label}</InputLabel>
      
      <Box sx={{ mt: 3 }}>
        {/* オートコンプリート検索 */}
        <Autocomplete
          open={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          options={options}
          getOptionLabel={getOptionLabel}
          renderOption={renderOption}
          filterOptions={(options) => options} // フィルタリングは独自実装
          value={null}
          onChange={handleAutocompleteChange}
          inputValue={searchTerm}
          onInputChange={(event, newInputValue) => setSearchTerm(newInputValue)}
          disabled={disabled || isCreating}
          loading={isCreating}
          loadingText="タグを作成中..."
          noOptionsText={
            searchTerm.trim() 
              ? `"${searchTerm}" に一致するタグが見つかりません`
              : "タグを入力して検索してください"
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={placeholder}
              size="small"
              InputProps={{
                ...params.InputProps,
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              }}
            />
          )}
          PaperComponent={(props) => (
            <Paper {...props} sx={{ maxHeight: maxHeight, overflow: 'auto' }} />
          )}
        />

        {/* 選択されたタグの表示 */}
        {selectedTags.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              選択中のタグ:
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {selectedTags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={showCount ? `${tag.name} (${tag.count})` : tag.name}
                  size="small"
                  onDelete={disabled ? undefined : () => handleChipDelete(tag.id)}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* 制限に関する警告 */}
        {maxSelection && selectedTagIds.length >= maxSelection && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            最大 {maxSelection} 個まで選択できます
          </Alert>
        )}

        {/* 統計情報 */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="text.secondary">
            {filteredTags.length} / {tags.length} タグ
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedTagIds.length} 選択中
            {maxSelection && ` / ${maxSelection}`}
          </Typography>
        </Box>

        {/* 新規作成のヒント */}
        {allowCreate && !disabled && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            存在しないタグ名を入力すると新規作成できます
          </Typography>
        )}
      </Box>
    </FormControl>
  );
}

export default SearchableTagSelector;