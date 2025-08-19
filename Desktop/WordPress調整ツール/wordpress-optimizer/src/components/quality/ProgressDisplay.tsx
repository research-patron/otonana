import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Grid,
  Chip,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  Collapse
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import type { QualityCheckProgress } from '../../types';

interface ProgressDisplayProps {
  progress: QualityCheckProgress;
  onCancel?: () => void;
  canCancel?: boolean;
}

export default function ProgressDisplay({
  progress,
  onCancel,
  canCancel = false
}: ProgressDisplayProps) {
  const [showErrors, setShowErrors] = React.useState(false);

  // 時間フォーマット関数
  const formatTime = (milliseconds?: number): string => {
    if (!milliseconds) return '--';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getStatusInfo = () => {
    switch (progress.status) {
      case 'idle':
        return {
          color: 'default' as const,
          icon: <InfoIcon />,
          message: '待機中'
        };
      case 'fetching':
        return {
          color: 'info' as const,
          icon: <InfoIcon />,
          message: '記事を取得中...'
        };
      case 'analyzing':
        return {
          color: 'primary' as const,
          icon: <InfoIcon />,
          message: '品質分析を実行中...'
        };
      case 'completed':
        return {
          color: 'success' as const,
          icon: <CheckCircleIcon />,
          message: '分析完了'
        };
      case 'error':
        return {
          color: 'error' as const,
          icon: <ErrorIcon />,
          message: 'エラーが発生しました'
        };
      case 'cancelled':
        return {
          color: 'warning' as const,
          icon: <CancelIcon />,
          message: 'キャンセルされました'
        };
      default:
        return {
          color: 'default' as const,
          icon: <InfoIcon />,
          message: '不明な状態'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const isRunning = ['fetching', 'analyzing'].includes(progress.status);

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          {/* ステータス表示 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                icon={statusInfo.icon}
                label={statusInfo.message}
                color={statusInfo.color}
                sx={{ mr: 2 }}
              />
              
              {canCancel && isRunning && onCancel && (
                <IconButton
                  onClick={onCancel}
                  color="error"
                  size="small"
                  sx={{ ml: 'auto' }}
                >
                  <CancelIcon />
                </IconButton>
              )}
            </Box>

            {/* 進捗バー */}
            {progress.total > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    進捗: {progress.current} / {progress.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {progress.percentage}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={progress.percentage}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
            )}

            {/* 現在処理中の記事 */}
            {isRunning && progress.currentTitle && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  処理中: {progress.currentTitle}
                </Typography>
              </Alert>
            )}
          </Grid>

          {/* 時間関連の表示は削除 */}

          {/* エラー情報 */}
          {progress.errors.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" color="error" sx={{ flexGrow: 1 }}>
                  エラー ({progress.errors.length}件)
                </Typography>
                <IconButton
                  onClick={() => setShowErrors(!showErrors)}
                  size="small"
                >
                  {showErrors ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={showErrors}>
                <List dense>
                  {progress.errors.slice(0, 10).map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={error}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'error'
                        }}
                      />
                    </ListItem>
                  ))}
                  {progress.errors.length > 10 && (
                    <ListItem>
                      <ListItemText
                        primary={`...他${progress.errors.length - 10}件のエラー`}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'text.secondary'
                        }}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Grid>
          )}

          {/* 完了時の統計情報 */}
          {progress.status === 'completed' && (
            <Grid item xs={12}>
              <Alert severity="success">
                <Typography variant="h6" gutterBottom>
                  品質チェック完了
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      総記事数
                    </Typography>
                    <Typography variant="h6">
                      {progress.total}件
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      処理完了
                    </Typography>
                    <Typography variant="h6">
                      {progress.current}件
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      エラー
                    </Typography>
                    <Typography variant="h6" color="error">
                      {progress.errors.length}件
                    </Typography>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography variant="body2" color="text.secondary">
                      総処理時間
                    </Typography>
                    <Typography variant="h6">
                      {formatTime(progress.timeElapsed)}
                    </Typography>
                  </Grid>
                </Grid>
              </Alert>
            </Grid>
          )}

          {/* エラー時の情報 */}
          {progress.status === 'error' && (
            <Grid item xs={12}>
              <Alert severity="error">
                <Typography variant="h6" gutterBottom>
                  品質チェックが中断されました
                </Typography>
                {progress.errors.length > 0 && (
                  <Typography variant="body2">
                    最新のエラー: {progress.errors[progress.errors.length - 1]}
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}

          {/* キャンセル時の情報 */}
          {progress.status === 'cancelled' && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <Typography variant="h6" gutterBottom>
                  品質チェックがキャンセルされました
                </Typography>
                <Typography variant="body2">
                  {progress.current}件の記事を処理しました（全{progress.total}件中）
                </Typography>
              </Alert>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}