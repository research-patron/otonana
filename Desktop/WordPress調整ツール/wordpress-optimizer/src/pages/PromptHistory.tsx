import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Rating,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  Analytics as AnalyticsIcon,
  Article as ArticleIcon,
  Star as StarIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Event as EventIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import SEOScoreDisplay from '../components/common/SEOScoreDisplay';
import { useAppStore } from '../store';
import {
  getPromptHistory,
  filterPromptHistory,
  calculatePromptHistoryStats,
  addUserRating,
  deletePromptHistory,
  getTopRatedPromptHistory,
  getMostSuccessfulPromptHistory,
} from '../services/promptHistory';
import type { PromptHistory, PromptHistoryFilter, PromptHistoryStats } from '../types';

function PromptHistoryPage() {
  const { config } = useAppStore();
  
  // State management
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PromptHistory[]>([]);
  const [stats, setStats] = useState<PromptHistoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Filter state
  const [filters, setFilters] = useState<PromptHistoryFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [selectedHistory, setSelectedHistory] = useState<PromptHistory | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [config?.currentSiteId]);

  // Filter history when filters or search term change
  useEffect(() => {
    applyFilters();
  }, [history, filters, searchTerm]);

  const loadData = () => {
    setLoading(true);
    try {
      const allHistory = getPromptHistory();
      setHistory(allHistory);
      
      const calculatedStats = calculatePromptHistoryStats(config?.currentSiteId);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Failed to load prompt history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = filterPromptHistory(filters);
    
    // Search term filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.originalPrompt.toLowerCase().includes(term) ||
        item.userInput.toLowerCase().includes(term) ||
        item.resultingArticles.some(article => 
          article.title.toLowerCase().includes(term)
        )
      );
    }
    
    setFilteredHistory(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof PromptHistoryFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  const handleRatingChange = (historyId: string, rating: number) => {
    addUserRating(historyId, rating);
    loadData();
  };

  const handleDeleteHistory = (historyId: string) => {
    if (window.confirm('この履歴を削除しますか？')) {
      deletePromptHistory(historyId);
      loadData();
    }
  };

  const handleViewDetails = (historyItem: PromptHistory) => {
    setSelectedHistory(historyItem);
    setShowDetailDialog(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  // Pagination
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'ready_to_publish': return 'warning';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <DescriptionIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" component="h1">
            プロンプト履歴
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary">
          過去に使用したプロンプトの履歴、生成された記事、SEO評価を確認できます。
        </Typography>
      </Box>

      {/* Statistics Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CodeIcon color="primary" />
                  <Typography variant="h6">{stats.totalPrompts}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  総プロンプト数
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArticleIcon color="success" />
                  <Typography variant="h6">{stats.totalArticlesCreated}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  生成記事数
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon color="warning" />
                  <Typography variant="h6">{stats.averageSeoScore}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  平均SEOスコア
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="info" />
                  <Typography variant="h6">
                    {stats.successfulPrompts}/{stats.totalPrompts}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  成功率
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            placeholder="プロンプトや記事タイトルを検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            フィルター
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<AnalyticsIcon />}
            onClick={() => setShowStatsDialog(true)}
          >
            詳細統計
          </Button>
        </Box>

        {/* Filter Panel */}
        {showFilters && (
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>モデル</InputLabel>
                  <Select
                    value={filters.modelUsed || ''}
                    onChange={(e) => handleFilterChange('modelUsed', e.target.value)}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    <MenuItem value="gemini-2.5-pro">Gemini 2.5 Pro</MenuItem>
                    <MenuItem value="gemini-2.5-flash">Gemini 2.5 Flash</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="最小SEOスコア"
                  type="number"
                  size="small"
                  fullWidth
                  value={filters.minSeoScore || ''}
                  onChange={(e) => handleFilterChange('minSeoScore', Number(e.target.value) || undefined)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>記事の有無</InputLabel>
                  <Select
                    value={filters.hasArticles === undefined ? '' : filters.hasArticles.toString()}
                    onChange={(e) => handleFilterChange('hasArticles', 
                      e.target.value === '' ? undefined : e.target.value === 'true'
                    )}
                  >
                    <MenuItem value="">すべて</MenuItem>
                    <MenuItem value="true">記事あり</MenuItem>
                    <MenuItem value="false">記事なし</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" onClick={clearFilters}>
                    クリア
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* History List */}
      <Box sx={{ mb: 3 }}>
        {paginatedHistory.length === 0 ? (
          <Alert severity="info">
            {filteredHistory.length === 0 && history.length > 0 
              ? 'フィルターに一致する履歴がありません。'
              : 'プロンプト履歴がありません。記事を作成するとここに表示されます。'
            }
          </Alert>
        ) : (
          <Stack spacing={2}>
            {paginatedHistory.map((item) => (
              <Card key={item.id} elevation={2}>
                <CardContent>
                  <Grid container spacing={2}>
                    {/* Left: Prompt Info */}
                    <Grid item xs={12} md={8}>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Chip 
                            label={item.modelUsed} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(item.generatedAt)}
                          </Typography>
                          
                          {item.fileInfo && (
                            <Chip 
                              label={`📄 ${item.fileInfo.filename}`} 
                              size="small" 
                              color="info" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                        
                        <Typography variant="body2" sx={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          mb: 1
                        }}>
                          {item.originalPrompt}
                        </Typography>
                        
                        {/* Generated Articles */}
                        {item.resultingArticles.length > 0 && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" display="block">
                              生成された記事:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {item.resultingArticles.map((article, index) => (
                                <Chip
                                  key={index}
                                  label={article.title}
                                  size="small"
                                  color={getStatusColor(article.status)}
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                    
                    {/* Right: Metrics & Actions */}
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                        {/* SEO Score */}
                        {item.seoMetrics && (
                          <Box sx={{ mt: 1 }}>
                            <SEOScoreDisplay 
                              seoMetrics={item.seoMetrics} 
                              size="small"
                              showDetails={true}
                            />
                          </Box>
                        )}
                        
                        {/* Word Count */}
                        {item.fileInfo && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DescriptionIcon fontSize="small" />
                            <Typography variant="body2">
                              {item.fileInfo.wordCount.toLocaleString()}文字
                            </Typography>
                          </Box>
                        )}
                        
                        {/* User Rating */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Rating
                            value={item.userRating || 0}
                            onChange={(_, value) => value && handleRatingChange(item.id, value)}
                            size="small"
                          />
                        </Box>
                        
                        {/* Actions */}
                        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                          <Tooltip title="詳細を表示">
                            <IconButton size="small" onClick={() => handleViewDetails(item)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="プロンプトをコピー">
                            <IconButton 
                              size="small" 
                              onClick={() => copyToClipboard(item.originalPrompt)}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="削除">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteHistory(item.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color="primary"
          />
        </Box>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          プロンプト詳細
        </DialogTitle>
        <DialogContent>
          {selectedHistory && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    プロンプト内容
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedHistory.originalPrompt}
                    </Typography>
                  </Paper>
                </Grid>
                
                {selectedHistory.fileInfo && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      ファイル情報
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Chip label={selectedHistory.fileInfo.filename} />
                      <Chip label={`${selectedHistory.fileInfo.wordCount.toLocaleString()}文字`} />
                      <Chip label={`${(selectedHistory.fileInfo.fileSize / 1024).toFixed(1)}KB`} />
                    </Box>
                  </Grid>
                )}
                
                {selectedHistory.seoMetrics && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      SEO評価
                    </Typography>
                    <TableContainer component={Paper} sx={{ mt: 1 }}>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell>総合スコア</TableCell>
                            <TableCell>{selectedHistory.seoMetrics.overallScore}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>タイトル</TableCell>
                            <TableCell>{selectedHistory.seoMetrics.titleScore}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>メタディスクリプション</TableCell>
                            <TableCell>{selectedHistory.seoMetrics.metaDescriptionScore}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>コンテンツ構造</TableCell>
                            <TableCell>{selectedHistory.seoMetrics.contentStructureScore}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>キーワード最適化</TableCell>
                            <TableCell>{selectedHistory.seoMetrics.keywordOptimizationScore}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                )}
                
                {selectedHistory.resultingArticles.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      生成された記事
                    </Typography>
                    <Stack spacing={1}>
                      {selectedHistory.resultingArticles.map((article, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ArticleIcon fontSize="small" />
                          <Typography variant="body2" sx={{ flexGrow: 1 }}>
                            {article.title}
                          </Typography>
                          <Chip 
                            label={article.status} 
                            size="small" 
                            color={getStatusColor(article.status)}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(article.createdAt)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog
        open={showStatsDialog}
        onClose={() => setShowStatsDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          詳細統計
        </DialogTitle>
        <DialogContent>
          {stats && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={3}>
                {/* Model Statistics */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    モデル別統計
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>モデル</TableCell>
                          <TableCell align="right">使用回数</TableCell>
                          <TableCell align="right">平均コスト</TableCell>
                          <TableCell align="right">平均SEO</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stats.modelStats).map(([model, modelStat]) => (
                          <TableRow key={model}>
                            <TableCell>{model}</TableCell>
                            <TableCell align="right">{modelStat.usage}</TableCell>
                            <TableCell align="right">¥{modelStat.averageCost.toFixed(2)}</TableCell>
                            <TableCell align="right">{modelStat.averageSeoScore.toFixed(1)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                
                {/* Monthly Statistics */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    月別統計
                  </Typography>
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>月</TableCell>
                          <TableCell align="right">プロンプト</TableCell>
                          <TableCell align="right">記事</TableCell>
                          <TableCell align="right">コスト</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(stats.monthlyStats)
                          .sort(([a], [b]) => b.localeCompare(a))
                          .slice(0, 6)
                          .map(([month, monthStat]) => (
                          <TableRow key={month}>
                            <TableCell>{month}</TableCell>
                            <TableCell align="right">{monthStat.promptCount}</TableCell>
                            <TableCell align="right">{monthStat.articlesCreated}</TableCell>
                            <TableCell align="right">¥{monthStat.cost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStatsDialog(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PromptHistoryPage;