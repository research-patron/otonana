import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Chip,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  FormControlLabel,
  Checkbox,
  ButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Check as ApproveIcon,
  Close as RejectIcon,
  Edit as EditIcon,
  Visibility as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  PriorityHigh as PriorityIcon,
  ContentCopy as CopyIcon,
  Undo as UndoIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import type { 
  RewriteSuggestion, 
  SuggestionApprovalState 
} from '../../types';

interface SuggestionEditorProps {
  rewriteSuggestion: RewriteSuggestion;
  onSuggestionUpdate: (updatedSuggestion: RewriteSuggestion) => void;
  onBatchApproval?: (action: 'approve_all' | 'reject_all', filterCriteria?: {
    priority?: 'high' | 'medium' | 'low';
    type?: string;
  }) => void;
  disabled?: boolean;
}

const PRIORITY_COLORS = {
  high: 'error',
  medium: 'warning', 
  low: 'info'
} as const;

const TYPE_LABELS = {
  title: 'タイトル',
  content: '本文',
  meta_description: 'メタディスクリプション',
  heading: '見出し',
  paragraph: '段落',
  sentence: '文'
} as const;

export default function SuggestionEditor({ 
  rewriteSuggestion, 
  onSuggestionUpdate,
  onBatchApproval,
  disabled = false 
}: SuggestionEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [previewSuggestion, setPreviewSuggestion] = useState<any | null>(null);
  const [batchSelectCriteria, setBatchSelectCriteria] = useState({
    priority: '',
    type: '',
    selectAll: false
  });

  const handleIndividualApproval = useCallback((
    suggestionId: string,
    status: 'approved' | 'rejected' | 'modified',
    modifiedText?: string
  ) => {
    const updatedSuggestion = { ...rewriteSuggestion };
    
    updatedSuggestion.approvalState.individualApprovals[suggestionId] = {
      status,
      modifiedText,
      modifiedAt: status === 'modified' ? new Date().toISOString() : undefined
    };

    // 全体のステータスを更新
    const allStatuses = Object.values(updatedSuggestion.approvalState.individualApprovals);
    const approvedCount = allStatuses.filter(a => ['approved', 'modified'].includes(a.status)).length;
    const rejectedCount = allStatuses.filter(a => a.status === 'rejected').length;
    const totalCount = updatedSuggestion.suggestions.length;

    if (approvedCount === totalCount) {
      updatedSuggestion.approvalState.overallStatus = 'fully_approved';
      updatedSuggestion.approvalState.approvedAt = new Date().toISOString();
    } else if (rejectedCount === totalCount) {
      updatedSuggestion.approvalState.overallStatus = 'rejected';
    } else if (approvedCount > 0 || rejectedCount > 0) {
      updatedSuggestion.approvalState.overallStatus = 'partially_approved';
    } else {
      updatedSuggestion.approvalState.overallStatus = 'pending';
    }

    onSuggestionUpdate(updatedSuggestion);
  }, [rewriteSuggestion, onSuggestionUpdate]);

  const handleEdit = (suggestionId: string, currentText: string) => {
    setEditingId(suggestionId);
    setEditedText(currentText);
  };

  const handleSaveEdit = (suggestionId: string) => {
    if (editedText.trim()) {
      handleIndividualApproval(suggestionId, 'modified', editedText.trim());
    }
    setEditingId(null);
    setEditedText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedText('');
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getApprovalStatus = (suggestionId: string) => {
    return rewriteSuggestion.approvalState.individualApprovals[suggestionId]?.status || 'pending';
  };

  const getModifiedText = (suggestionId: string) => {
    return rewriteSuggestion.approvalState.individualApprovals[suggestionId]?.modifiedText;
  };

  const renderSuggestionCard = (suggestion: any) => {
    const status = getApprovalStatus(suggestion.id);
    const modifiedText = getModifiedText(suggestion.id);
    const isEditing = editingId === suggestion.id;
    
    let statusColor: 'default' | 'success' | 'error' | 'warning' = 'default';
    let statusLabel = '保留中';
    
    switch (status) {
      case 'approved':
        statusColor = 'success';
        statusLabel = '承認済み';
        break;
      case 'rejected':
        statusColor = 'error';
        statusLabel = '却下';
        break;
      case 'modified':
        statusColor = 'warning';
        statusLabel = 'カスタム修正';
        break;
    }

    return (
      <Card 
        key={suggestion.id} 
        variant="outlined"
        sx={{ 
          mb: 2,
          border: status === 'approved' ? '2px solid' : '1px solid',
          borderColor: status === 'approved' ? 'success.main' : 
                      status === 'rejected' ? 'error.main' :
                      status === 'modified' ? 'warning.main' : 'divider'
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={TYPE_LABELS[suggestion.type as keyof typeof TYPE_LABELS] || suggestion.type}
                size="small"
                variant="outlined"
              />
              <Chip
                label={suggestion.priority}
                size="small"
                color={PRIORITY_COLORS[suggestion.priority as keyof typeof PRIORITY_COLORS]}
                icon={<PriorityIcon />}
              />
              <Chip
                label={statusLabel}
                size="small"
                color={statusColor}
              />
            </Box>
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>修正理由:</strong> {suggestion.reason}
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* 元のテキスト */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  変更前
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: status === 'approved' || status === 'modified' ? 'text.disabled' : 'text.primary'
                  }}
                >
                  {suggestion.originalText}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Tooltip title="コピー">
                    <IconButton 
                      size="small" 
                      onClick={() => handleCopyToClipboard(suggestion.originalText)}
                    >
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Grid>

            {/* 提案されたテキスト/修正されたテキスト */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ 
                p: 2, 
                bgcolor: status === 'approved' ? 'success.light' : 
                        status === 'modified' ? 'warning.light' : 'primary.light'
              }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  {status === 'modified' ? 'カスタム修正版' : '提案内容'}
                </Typography>
                
                {isEditing ? (
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      variant="outlined"
                      size="small"
                      autoFocus
                    />
                    <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={() => handleSaveEdit(suggestion.id)}
                        disabled={!editedText.trim()}
                      >
                        保存
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<UndoIcon />}
                        onClick={handleCancelEdit}
                      >
                        キャンセル
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        color: status === 'rejected' ? 'text.disabled' : 'text.primary'
                      }}
                    >
                      {modifiedText || suggestion.suggestedText}
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      <Tooltip title="コピー">
                        <IconButton 
                          size="small" 
                          onClick={() => handleCopyToClipboard(modifiedText || suggestion.suggestedText)}
                        >
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="プレビュー">
                        <IconButton
                          size="small"
                          onClick={() => setPreviewSuggestion(suggestion)}
                        >
                          <PreviewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* アクションボタン */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {status !== 'approved' && (
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<ApproveIcon />}
                onClick={() => handleIndividualApproval(suggestion.id, 'approved')}
                disabled={disabled || isEditing}
              >
                承認
              </Button>
            )}
            
            {status !== 'rejected' && (
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<RejectIcon />}
                onClick={() => handleIndividualApproval(suggestion.id, 'rejected')}
                disabled={disabled || isEditing}
              >
                却下
              </Button>
            )}
            
            {!isEditing && status !== 'rejected' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditIcon />}
                onClick={() => handleEdit(suggestion.id, modifiedText || suggestion.suggestedText)}
                disabled={disabled}
              >
                編集
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderBatchActions = () => {
    const suggestions = rewriteSuggestion.suggestions;
    const pendingSuggestions = suggestions.filter(s => getApprovalStatus(s.id) === 'pending');
    const approvedCount = suggestions.filter(s => ['approved', 'modified'].includes(getApprovalStatus(s.id))).length;
    const rejectedCount = suggestions.filter(s => getApprovalStatus(s.id) === 'rejected').length;

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">一括操作</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                承認統計
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Chip label={`承認済み: ${approvedCount}`} color="success" size="small" />
                <Chip label={`却下: ${rejectedCount}`} color="error" size="small" />
                <Chip label={`保留中: ${pendingSuggestions.length}`} color="default" size="small" />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                一括承認・却下
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  onClick={() => onBatchApproval?.('approve_all')}
                  disabled={disabled || pendingSuggestions.length === 0}
                >
                  全て承認
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={() => onBatchApproval?.('reject_all')}
                  disabled={disabled || pendingSuggestions.length === 0}
                >
                  全て却下
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onBatchApproval?.('approve_all', { priority: 'high' })}
                  disabled={disabled || suggestions.filter(s => s.priority === 'high' && getApprovalStatus(s.id) === 'pending').length === 0}
                >
                  高優先度のみ承認
                </Button>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            リライト提案の編集・承認
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            記事「{rewriteSuggestion.postTitle}」に対する {rewriteSuggestion.suggestions.length} 件の修正提案
          </Typography>

          <Alert 
            severity={
              rewriteSuggestion.approvalState.overallStatus === 'fully_approved' ? 'success' :
              rewriteSuggestion.approvalState.overallStatus === 'rejected' ? 'error' :
              rewriteSuggestion.approvalState.overallStatus === 'partially_approved' ? 'warning' : 'info'
            }
            sx={{ mb: 2 }}
          >
            ステータス: {
              rewriteSuggestion.approvalState.overallStatus === 'fully_approved' ? '全承認完了' :
              rewriteSuggestion.approvalState.overallStatus === 'rejected' ? '全却下' :
              rewriteSuggestion.approvalState.overallStatus === 'partially_approved' ? '部分承認' : '承認待ち'
            }
          </Alert>

          {renderBatchActions()}
        </CardContent>
      </Card>

      {/* 個別提案の表示 */}
      <Box>
        {rewriteSuggestion.suggestions.map(renderSuggestionCard)}
      </Box>

      {/* プレビューダイアログ */}
      <Dialog
        open={!!previewSuggestion}
        onClose={() => setPreviewSuggestion(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>提案内容の詳細プレビュー</DialogTitle>
        <DialogContent>
          {previewSuggestion && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    提案タイプ
                  </Typography>
                  <Chip 
                    label={TYPE_LABELS[previewSuggestion.type as keyof typeof TYPE_LABELS] || previewSuggestion.type} 
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    優先度
                  </Typography>
                  <Chip 
                    label={previewSuggestion.priority}
                    color={PRIORITY_COLORS[previewSuggestion.priority as keyof typeof PRIORITY_COLORS]}
                  />
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                修正理由
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2">
                  {previewSuggestion.reason}
                </Typography>
              </Paper>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                変更前
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {previewSuggestion.originalText}
                </Typography>
              </Paper>
              
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                提案内容
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {getModifiedText(previewSuggestion.id) || previewSuggestion.suggestedText}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewSuggestion(null)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}