import { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import type { SEOMetrics } from '../../types';

interface SEOScoreDisplayProps {
  seoMetrics: SEOMetrics;
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

function SEOScoreDisplay({ seoMetrics, size = 'medium', showDetails = true }: SEOScoreDisplayProps) {
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const getScoreColor = (score: number): 'success' | 'warning' | 'error' => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckIcon color="success" />;
    if (score >= 60) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  const getScoreText = (score: number): string => {
    if (score >= 90) return '優秀';
    if (score >= 80) return '良好';
    if (score >= 60) return '普通';
    if (score >= 40) return '要改善';
    return '不良';
  };

  const circleSize = size === 'small' ? 60 : size === 'medium' ? 80 : 120;
  const fontSize = size === 'small' ? '0.875rem' : size === 'medium' ? '1rem' : '1.25rem';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* 円形プログレス */}
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={seoMetrics.overallScore}
          size={circleSize}
          thickness={4}
          color={getScoreColor(seoMetrics.overallScore)}
          sx={{
            circle: {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant={size === 'small' ? 'body2' : size === 'medium' ? 'body1' : 'h6'}
            component="div"
            color="text.primary"
            fontWeight="bold"
          >
            {seoMetrics.overallScore}
          </Typography>
          <Typography
            variant="caption"
            component="div"
            color="text.secondary"
            sx={{ fontSize: size === 'small' ? '0.625rem' : '0.75rem' }}
          >
            /100
          </Typography>
        </Box>
      </Box>

      {/* スコア情報 */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant={fontSize === '1.25rem' ? 'h6' : 'body2'} fontWeight="bold">
            SEO評価
          </Typography>
          <Chip
            label={getScoreText(seoMetrics.overallScore)}
            color={getScoreColor(seoMetrics.overallScore)}
            size="small"
            icon={getScoreIcon(seoMetrics.overallScore)}
          />
        </Box>

        {showDetails && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              詳細を表示
            </Typography>
            <Tooltip title="SEO評価の詳細と改善提案を表示">
              <IconButton
                size="small"
                onClick={() => setShowDetailDialog(true)}
                color="primary"
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* 詳細ダイアログ */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CircularProgress
                variant="determinate"
                value={seoMetrics.overallScore}
                size={60}
                thickness={4}
                color={getScoreColor(seoMetrics.overallScore)}
              />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <Typography variant="body2" fontWeight="bold">
                  {seoMetrics.overallScore}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  /100
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="h6">SEO評価詳細</Typography>
              <Typography variant="body2" color="text.secondary">
                記事ID: {seoMetrics.articleId}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              評価項目別スコア
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>項目</TableCell>
                    <TableCell align="right">スコア</TableCell>
                    <TableCell align="right">評価</TableCell>
                    <TableCell>詳細</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>タイトル</TableCell>
                    <TableCell align="right">{seoMetrics.titleScore}/100</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={getScoreText(seoMetrics.titleScore)}
                        color={getScoreColor(seoMetrics.titleScore)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{seoMetrics.titleLength}文字</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>メタディスクリプション</TableCell>
                    <TableCell align="right">{seoMetrics.metaDescriptionScore}/100</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={getScoreText(seoMetrics.metaDescriptionScore)}
                        color={getScoreColor(seoMetrics.metaDescriptionScore)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{seoMetrics.metaDescriptionLength}文字</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>コンテンツ構造</TableCell>
                    <TableCell align="right">{seoMetrics.contentStructureScore}/100</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={getScoreText(seoMetrics.contentStructureScore)}
                        color={getScoreColor(seoMetrics.contentStructureScore)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {seoMetrics.wordCount}文字、見出し{Object.values(seoMetrics.headingCount).reduce((sum, count) => sum + count, 0)}個
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>キーワード最適化</TableCell>
                    <TableCell align="right">{seoMetrics.keywordOptimizationScore}/100</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={getScoreText(seoMetrics.keywordOptimizationScore)}
                        color={getScoreColor(seoMetrics.keywordOptimizationScore)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{seoMetrics.keywords.length}個のキーワード</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {seoMetrics.recommendations.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                改善提案
              </Typography>
              <List dense>
                {seoMetrics.recommendations.map((recommendation, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <WarningIcon color="warning" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={recommendation} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              キーワード分析
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {seoMetrics.keywords.slice(0, 10).map((keyword, index) => (
                <Chip
                  key={index}
                  label={`${keyword.term} (${keyword.density}%)`}
                  variant="outlined"
                  size="small"
                  color={keyword.density >= 2 ? 'primary' : keyword.density >= 1 ? 'default' : 'error'}
                />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary">
              評価日時: {new Date(seoMetrics.calculatedAt).toLocaleString('ja-JP')}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SEOScoreDisplay;