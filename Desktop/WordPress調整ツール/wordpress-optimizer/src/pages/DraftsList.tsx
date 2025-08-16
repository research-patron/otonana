import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useDraftStore, useAppStore } from '../store';
import type { DraftArticle } from '../types';

function DraftsList() {
  const navigate = useNavigate();
  const { drafts, deleteDraft, getDraftsBySite } = useDraftStore();
  const { config } = useAppStore();

  // フィルタリング・検索用ステート
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'updatedAt' | 'createdAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  
  // ダイアログ用ステート
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; draft: DraftArticle | null }>({
    open: false,
    draft: null,
  });

  const [filteredDrafts, setFilteredDrafts] = useState<DraftArticle[]>([]);

  // 下書きのフィルタリングとソート
  useEffect(() => {
    let filtered = [...drafts];

    // サイトフィルタ
    if (siteFilter !== 'all') {
      filtered = filtered.filter(draft => draft.siteId === siteFilter);
    }

    // 検索フィルタ
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(draft =>
        draft.title.toLowerCase().includes(term) ||
        draft.content.toLowerCase().includes(term) ||
        draft.metaDescription.toLowerCase().includes(term)
      );
    }

    // ソート
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          compareValue = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    setFilteredDrafts(filtered);
  }, [drafts, searchTerm, sortBy, sortOrder, siteFilter]);

  // 文字数カウント（HTMLタグを除去）
  const getWordCount = (content: string): number => {
    return content.replace(/<[^>]*>/g, '').trim().length;
  };

  // 作成・更新時間の表示
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return '今日';
    } else if (days === 1) {
      return '昨日';
    } else if (days < 7) {
      return `${days}日前`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // サイト名取得
  const getSiteName = (siteId: string): string => {
    const site = config?.sites.find(s => s.id === siteId);
    return site?.name || site?.url || '不明なサイト';
  };

  // 削除確認ダイアログ
  const handleDeleteClick = (draft: DraftArticle) => {
    setDeleteDialog({ open: true, draft });
  };

  const handleDeleteConfirm = () => {
    if (deleteDialog.draft) {
      deleteDraft(deleteDialog.draft.id);
      setDeleteDialog({ open: false, draft: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ open: false, draft: null });
  };

  // 編集画面への遷移
  const handleEdit = (draftId: string) => {
    navigate(`/edit/${draftId}`);
  };

  // 新規作成
  const handleCreateNew = () => {
    navigate('/create');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1">
            下書き管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
          >
            新規作成
          </Button>
        </Box>

        {/* フィルタ・検索バー */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="タイトルや内容で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth>
                  <InputLabel>サイト</InputLabel>
                  <Select
                    value={siteFilter}
                    label="サイト"
                    onChange={(e) => setSiteFilter(e.target.value)}
                  >
                    <MenuItem value="all">すべて</MenuItem>
                    {config?.sites.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.name || site.url}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>並び順</InputLabel>
                  <Select
                    value={`${sortBy}-${sortOrder}`}
                    label="並び順"
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field as typeof sortBy);
                      setSortOrder(order as typeof sortOrder);
                    }}
                  >
                    <MenuItem value="updatedAt-desc">更新日（新しい順）</MenuItem>
                    <MenuItem value="updatedAt-asc">更新日（古い順）</MenuItem>
                    <MenuItem value="createdAt-desc">作成日（新しい順）</MenuItem>
                    <MenuItem value="createdAt-asc">作成日（古い順）</MenuItem>
                    <MenuItem value="title-asc">タイトル（昇順）</MenuItem>
                    <MenuItem value="title-desc">タイトル（降順）</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon />
                  <Typography variant="body2" color="text.secondary">
                    {filteredDrafts.length}件の下書き
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 下書きリスト */}
        {filteredDrafts.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              {drafts.length === 0 ? (
                <>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    下書きがありません
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    新しい記事を作成して始めましょう
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateNew}
                  >
                    新規作成
                  </Button>
                </>
              ) : (
                <>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    検索条件に一致する下書きが見つかりません
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    検索キーワードやフィルタを変更してみてください
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {filteredDrafts.map((draft) => (
              <Grid item xs={12} sm={6} lg={4} key={draft.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    '&:hover': { boxShadow: 4 },
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="h2" gutterBottom noWrap>
                      {draft.title || '無題の記事'}
                    </Typography>
                    
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {draft.metaDescription || 
                       draft.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...' ||
                       '内容がありません'}
                    </Typography>

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Chip 
                        size="small" 
                        label={`${getWordCount(draft.content)}文字`}
                        variant="outlined"
                      />
                      <Chip 
                        size="small" 
                        label={getSiteName(draft.siteId)}
                        color="primary"
                        variant="outlined"
                      />
                      {draft.status === 'ready_to_publish' && (
                        <Chip 
                          size="small" 
                          label="公開可能"
                          color="success"
                        />
                      )}
                    </Box>

                    <Typography variant="caption" color="text.secondary">
                      更新: {formatDate(draft.updatedAt)}
                    </Typography>
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box>
                      <Tooltip title="編集">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEdit(draft.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="削除">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(draft)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(draft.id)}
                    >
                      編集
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 削除確認ダイアログ */}
        <Dialog
          open={deleteDialog.open}
          onClose={handleDeleteCancel}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>下書きを削除</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              この操作は元に戻せません。本当に削除しますか？
            </Alert>
            <Typography>
              <strong>タイトル:</strong> {deleteDialog.draft?.title || '無題の記事'}
            </Typography>
            <Typography>
              <strong>文字数:</strong> {deleteDialog.draft ? getWordCount(deleteDialog.draft.content) : 0}文字
            </Typography>
            <Typography>
              <strong>最終更新:</strong> {deleteDialog.draft ? formatDate(deleteDialog.draft.updatedAt) : '不明'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel}>
              キャンセル
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
            >
              削除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

export default DraftsList;