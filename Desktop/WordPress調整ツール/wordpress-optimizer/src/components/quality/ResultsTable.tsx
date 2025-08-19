import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  List,
  ListItem,
  ListItemText,
  Link,
  Grid,
  LinearProgress,
  Badge,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  OpenInNew as OpenInNewIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { QualityCheckResult, QualityCheckReport } from '../../types';

interface ResultsTableProps {
  report: QualityCheckReport;
  onResultClick?: (result: QualityCheckResult) => void;
}

type SortField = 'title' | 'overallScore' | 'priority' | 'lastModified' | 'categories';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function ResultsTable({ report, onResultClick }: ResultsTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'overallScore',
    direction: 'asc'
  });
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  // データのフィルタリングとソート
  const filteredAndSortedResults = useMemo(() => {
    let filtered = report.results;

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(result => 
        result.title.toLowerCase().includes(query) ||
        result.categories.some(cat => cat.name.toLowerCase().includes(query)) ||
        result.rewriteReasons.some(reason => reason.toLowerCase().includes(query))
      );
    }

    // 優先度フィルター
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(result => result.priority === priorityFilter);
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'overallScore':
          aValue = a.overallScore;
          bValue = b.overallScore;
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'lastModified':
          aValue = new Date(a.lastModified).getTime();
          bValue = new Date(b.lastModified).getTime();
          break;
        case 'categories':
          aValue = a.categories.map(c => c.name).join(', ');
          bValue = b.categories.map(c => c.name).join(', ');
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [report.results, searchQuery, priorityFilter, sortConfig]);

  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleRowExpansion = (postId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority: QualityCheckResult['priority']) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityIcon = (priority: QualityCheckResult['priority']) => {
    switch (priority) {
      case 'high':
        return <ErrorIcon />;
      case 'medium':
        return <WarningIcon />;
      case 'low':
        return <CheckCircleIcon />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'yyyy/MM/dd');
    } catch {
      return dateString;
    }
  };

  // ページングされた結果
  const paginatedResults = filteredAndSortedResults.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            品質チェック結果
          </Typography>
          
          {/* サマリー情報 */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    総記事数
                  </Typography>
                  <Typography variant="h6">
                    {report.summary.totalPosts}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    高優先度
                  </Typography>
                  <Typography variant="h6" color="error">
                    {report.summary.highPriorityIssues}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    中優先度
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {report.summary.mediumPriorityIssues}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={3}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    平均スコア
                  </Typography>
                  <Typography variant="h6" color={getScoreColor(report.summary.averageScore)}>
                    {report.summary.averageScore}点
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* フィルター・検索 */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="記事タイトル、カテゴリー、問題点で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ flexGrow: 1 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>優先度</InputLabel>
              <Select
                value={priorityFilter}
                label="優先度"
                onChange={(e) => setPriorityFilter(e.target.value as any)}
              >
                <MenuItem value="all">すべて</MenuItem>
                <MenuItem value="high">高</MenuItem>
                <MenuItem value="medium">中</MenuItem>
                <MenuItem value="low">低</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* 結果件数 */}
          <Typography variant="body2" color="text.secondary">
            {filteredAndSortedResults.length}件の結果（全{report.results.length}件中）
          </Typography>
        </Box>

        {/* テーブル */}
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" width={48}>
                  {/* 展開アイコン用 */}
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'title'}
                    direction={sortConfig.field === 'title' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    記事タイトル
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'overallScore'}
                    direction={sortConfig.field === 'overallScore' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('overallScore')}
                  >
                    総合スコア
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'priority'}
                    direction={sortConfig.field === 'priority' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('priority')}
                  >
                    優先度
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'categories'}
                    direction={sortConfig.field === 'categories' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('categories')}
                  >
                    カテゴリー
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'lastModified'}
                    direction={sortConfig.field === 'lastModified' ? sortConfig.direction : 'asc'}
                    onClick={() => handleSort('lastModified')}
                  >
                    最終更新
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">アクション</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedResults.map((result) => (
                <React.Fragment key={result.postId}>
                  <TableRow hover>
                    <TableCell padding="checkbox">
                      <IconButton
                        size="small"
                        onClick={() => toggleRowExpansion(result.postId)}
                      >
                        {expandedRows.has(result.postId) ? 
                          <ExpandLessIcon /> : <ExpandMoreIcon />
                        }
                      </IconButton>
                    </TableCell>
                    
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {result.title}
                        </Typography>
                        {result.error && (
                          <Typography variant="caption" color="error">
                            エラー: {result.error}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="h6" 
                          color={getScoreColor(result.overallScore)}
                        >
                          {result.overallScore}
                        </Typography>
                        <Box sx={{ width: 60 }}>
                          <LinearProgress
                            variant="determinate"
                            value={result.overallScore}
                            color={getScoreColor(result.overallScore)}
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        icon={getPriorityIcon(result.priority)}
                        label={result.priority === 'high' ? '高' : result.priority === 'medium' ? '中' : '低'}
                        color={getPriorityColor(result.priority)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {result.categories.slice(0, 2).map((category) => (
                          <Chip
                            key={category.id}
                            label={category.name}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {result.categories.length > 2 && (
                          <Chip
                            label={`+${result.categories.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(result.lastModified)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Tooltip title="記事を開く">
                        <IconButton
                          size="small"
                          onClick={() => window.open(result.url, '_blank')}
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  
                  {/* 展開された詳細情報 */}
                  <TableRow>
                    <TableCell 
                      colSpan={7} 
                      sx={{ py: 0, borderBottom: expandedRows.has(result.postId) ? undefined : 'none' }}
                    >
                      <Collapse 
                        in={expandedRows.has(result.postId)} 
                        timeout="auto" 
                        unmountOnExit
                      >
                        <Box sx={{ py: 2 }}>
                          <Grid container spacing={3}>
                            {/* スコア詳細 */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                詳細スコア
                              </Typography>
                              <List dense>
                                <ListItem>
                                  <ListItemText
                                    primary="古さスコア"
                                    secondary={`${result.ageScore}点`}
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemText
                                    primary="AI文章スコア"
                                    secondary={`${result.aiTextScore}点`}
                                  />
                                </ListItem>
                                <ListItem>
                                  <ListItemText
                                    primary="誤情報リスクスコア"
                                    secondary={`${result.misinformationScore}点`}
                                  />
                                </ListItem>
                              </List>
                            </Grid>
                            
                            {/* 問題点と推奨アクション */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" gutterBottom>
                                リライト推奨理由
                              </Typography>
                              <List dense>
                                {result.rewriteReasons.map((reason, index) => (
                                  <ListItem key={index}>
                                    <ListItemText
                                      primary={reason}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                              
                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                推奨アクション
                              </Typography>
                              <List dense>
                                {result.recommendedActions.map((action, index) => (
                                  <ListItem key={index}>
                                    <ListItemText
                                      primary={action}
                                      primaryTypographyProps={{ variant: 'body2' }}
                                    />
                                  </ListItem>
                                ))}
                              </List>
                            </Grid>
                            
                            {/* TextLint結果 */}
                            {result.textlintResult.messages.length > 0 && (
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom>
                                  文章品質チェック結果
                                </Typography>
                                <List dense>
                                  {result.textlintResult.messages.slice(0, 5).map((message, index) => (
                                    <ListItem key={index}>
                                      <ListItemText
                                        primary={message.message}
                                        secondary={`ルール: ${message.ruleId} (行: ${message.line})`}
                                        primaryTypographyProps={{ variant: 'body2' }}
                                        secondaryTypographyProps={{ variant: 'caption' }}
                                      />
                                    </ListItem>
                                  ))}
                                  {result.textlintResult.messages.length > 5 && (
                                    <ListItem>
                                      <ListItemText
                                        primary={`...他${result.textlintResult.messages.length - 5}件`}
                                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                      />
                                    </ListItem>
                                  )}
                                </List>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ページング */}
        <TablePagination
          component="div"
          count={filteredAndSortedResults.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="1ページあたりの行数:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / ${count !== -1 ? count : `more than ${to}`}`
          }
        />
      </CardContent>
    </Card>
  );
}