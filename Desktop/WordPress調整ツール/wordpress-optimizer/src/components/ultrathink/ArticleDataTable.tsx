import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Button,
  Alert,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
} from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import type { ArticleCSVData } from '../../types';
import {
  formatDate,
  formatWordCount,
  getStatusLabel,
  getStatusColor,
  calculateSEOScore,
  filterArticles,
  sortArticles,
} from '../../utils/articleDataUtils';

interface ArticleDataTableProps {
  articles: ArticleCSVData[];
  loading?: boolean;
  onExportSelected?: (selectedArticles: ArticleCSVData[]) => void;
  onAnalyzeSelected?: (selectedArticles: ArticleCSVData[]) => void;
}

interface ArticleDetailsProps {
  article: ArticleCSVData | null;
  open: boolean;
  onClose: () => void;
}

// 記事詳細ダイアログ
function ArticleDetailsDialog({ article, open, onClose }: ArticleDetailsProps) {
  if (!article) return null;

  const seoScore = calculateSEOScore(article);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" noWrap sx={{ flex: 1, mr: 2 }}>
            {article.title}
          </Typography>
          <Tooltip title="記事を開く">
            <IconButton
              onClick={() => window.open(article.url, '_blank')}
              size="small"
            >
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3}>
          {/* 基本情報 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              基本情報
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  ID: {article.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  スラッグ: {article.slug}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  文字数: {formatWordCount(article.wordCount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  公開日: {formatDate(article.publishedDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  更新日: {formatDate(article.modifiedDate)}
                </Typography>
                <Chip
                  label={getStatusLabel(article.status)}
                  color={getStatusColor(article.status)}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>

          {/* SEOスコア */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              SEOスコア
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LinearProgress
                variant="determinate"
                value={seoScore}
                sx={{ flex: 1, height: 8, borderRadius: 4 }}
                color={seoScore >= 80 ? 'success' : seoScore >= 60 ? 'warning' : 'error'}
              />
              <Typography variant="h6" color={seoScore >= 80 ? 'success.main' : seoScore >= 60 ? 'warning.main' : 'error.main'}>
                {seoScore}
              </Typography>
            </Box>
          </Box>

          {/* メタディスクリプション */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              メタディスクリプション ({article.metaDescription.length}文字)
            </Typography>
            <Typography variant="body2" sx={{ 
              p: 2, 
              bgcolor: 'grey.50', 
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200'
            }}>
              {article.metaDescription || 'メタディスクリプションが設定されていません'}
            </Typography>
          </Box>

          {/* カテゴリー */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              カテゴリー
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {article.categories.map(category => (
                <Chip
                  key={category.id}
                  label={category.name}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>

          {/* タグ */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              タグ
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {article.tags.map(tag => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  color="secondary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>閉じる</Button>
        <Button
          variant="contained"
          onClick={() => window.open(article.url, '_blank')}
          startIcon={<OpenInNewIcon />}
        >
          記事を開く
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ArticleDataTable({
  articles,
  loading = false,
  onExportSelected,
  onAnalyzeSelected,
}: ArticleDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<ArticleCSVData | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<keyof ArticleCSVData>('publishedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // フィルタリング・ソートされた記事
  const processedArticles = useMemo(() => {
    let filtered = articles;

    // 検索フィルター
    if (searchTerm.trim()) {
      filtered = filterArticles(filtered, { searchTerm: searchTerm.trim() });
    }

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filterArticles(filtered, { status: [statusFilter] });
    }

    // ソート
    filtered = sortArticles(filtered, sortBy, sortOrder);

    return filtered;
  }, [articles, searchTerm, statusFilter, sortBy, sortOrder]);

  // ページネーション用の記事
  const paginatedArticles = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return processedArticles.slice(startIndex, startIndex + rowsPerPage);
  }, [processedArticles, page, rowsPerPage]);

  // ハンドラー関数
  const handleSort = (field: keyof ArticleCSVData) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(paginatedArticles.map(article => article.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (articleId: number, checked: boolean) => {
    if (checked) {
      setSelectedRows([...selectedRows, articleId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== articleId));
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 選択された記事を取得
  const selectedArticles = useMemo(() => {
    return articles.filter(article => selectedRows.includes(article.id));
  }, [articles, selectedRows]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <Box>
      {/* フィルター・検索UI */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="記事を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                endAdornment: searchTerm && (
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                ),
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>ステータス</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="ステータス"
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="publish">公開済み</MenuItem>
                <MenuItem value="draft">下書き</MenuItem>
                <MenuItem value="private">非公開</MenuItem>
                <MenuItem value="pending">承認待ち</MenuItem>
                <MenuItem value="future">予約投稿</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              {onExportSelected && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => onExportSelected(selectedArticles)}
                  disabled={selectedArticles.length === 0}
                >
                  選択記事をエクスポート
                </Button>
              )}
              
              {onAnalyzeSelected && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AnalyticsIcon />}
                  onClick={() => onAnalyzeSelected(selectedArticles)}
                  disabled={selectedArticles.length === 0}
                >
                  選択記事を分析
                </Button>
              )}
            </Stack>
          </Grid>
        </Grid>

        {/* 統計情報 */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {processedArticles.length} / {articles.length} 記事を表示
          </Typography>
          
          {selectedRows.length > 0 && (
            <Typography variant="caption" color="primary">
              {selectedRows.length} 記事を選択中
            </Typography>
          )}
        </Box>
      </Paper>

      {/* データテーブル */}
      <Paper sx={{ width: '100%' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.length > 0 && selectedRows.length < paginatedArticles.length}
                    checked={paginatedArticles.length > 0 && selectedRows.length === paginatedArticles.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'title'}
                    direction={sortBy === 'title' ? sortOrder : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    タイトル
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'status'}
                    direction={sortBy === 'status' ? sortOrder : 'asc'}
                    onClick={() => handleSort('status')}
                  >
                    ステータス
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortBy === 'wordCount'}
                    direction={sortBy === 'wordCount' ? sortOrder : 'asc'}
                    onClick={() => handleSort('wordCount')}
                  >
                    文字数
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">SEO</TableCell>
                <TableCell>カテゴリー</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortBy === 'publishedDate'}
                    direction={sortBy === 'publishedDate' ? sortOrder : 'asc'}
                    onClick={() => handleSort('publishedDate')}
                  >
                    公開日
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : paginatedArticles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">
                      表示する記事がありません
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedArticles.map((article) => (
                  <TableRow
                    key={article.id}
                    selected={selectedRows.includes(article.id)}
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRows.includes(article.id)}
                        onChange={(e) => handleSelectRow(article.id, e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 300 }}>
                        <Typography variant="body2" noWrap title={article.title}>
                          {article.title}
                        </Typography>
                        <Tooltip title="詳細表示">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedArticle(article);
                              setDetailsOpen(true);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(article.status)}
                        color={getStatusColor(article.status)}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatWordCount(article.wordCount)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={calculateSEOScore(article)}
                        color={calculateSEOScore(article) >= 80 ? 'success' : calculateSEOScore(article) >= 60 ? 'warning' : 'error'}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {article.categories.slice(0, 2).map((category) => (
                          <Chip
                            key={category.id}
                            label={category.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                        {article.categories.length > 2 && (
                          <Chip
                            label={`+${article.categories.length - 2}`}
                            size="small"
                            color="default"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {formatDate(article.publishedDate, 'short')}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="詳細表示">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedArticle(article);
                              setDetailsOpen(true);
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="記事を開く">
                          <IconButton
                            size="small"
                            onClick={() => window.open(article.url, '_blank')}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* ページネーション */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={processedArticles.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="ページあたりの行数:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count !== -1 ? count : `${to}以上`}`}
        />
      </Paper>

      {/* 記事詳細ダイアログ */}
      <ArticleDetailsDialog
        article={selectedArticle}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setSelectedArticle(null);
        }}
      />
    </Box>
  );
}

export default ArticleDataTable;