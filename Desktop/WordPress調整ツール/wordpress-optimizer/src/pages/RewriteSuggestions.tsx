import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Paper,
  Divider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  Upload as ImportIcon,
  AutoFixHigh as SuggestIcon,
  Compare as CompareIcon,
  GetApp as ExportIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAppStore } from '../store';
import type { 
  ImportedQualityReport, 
  RewriteSuggestion, 
  BeforeAfterContent,
  WordPressSite,
  QualityCheckResult
} from '../types';
import CSVImporter from '../components/rewrite/CSVImporter';
import SuggestionEditor from '../components/rewrite/SuggestionEditor';
import BeforeAfterComparison from '../components/rewrite/BeforeAfterComparison';
import { rewriteSuggestionService } from '../services/rewriteSuggestionService';

const steps = [
  {
    label: 'CSVインポート',
    description: '品質チェック結果のCSVファイルをインポート'
  },
  {
    label: 'リライト提案生成',
    description: 'AI による具体的な修正提案を生成'
  },
  {
    label: '提案の確認・編集',
    description: '提案内容を確認し、必要に応じて編集・承認'
  },
  {
    label: '比較プレビュー',
    description: '変更前後の比較とファイナルコンテンツの確認'
  },
  {
    label: 'エクスポート',
    description: '最終的な改善内容をエクスポート'
  }
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rewrite-tabpanel-${index}`}
      aria-labelledby={`rewrite-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function RewriteSuggestions() {
  const { config } = useAppStore();
  const sites = config?.sites || [];
  const currentSite: WordPressSite | undefined = sites.find(site => site.id === config?.currentSiteId);

  const [activeStep, setActiveStep] = useState(0);
  const [importedReport, setImportedReport] = useState<ImportedQualityReport | null>(null);
  const [rewriteSuggestions, setRewriteSuggestions] = useState<RewriteSuggestion[]>([]);
  const [beforeAfterContents, setBeforeAfterContents] = useState<BeforeAfterContent[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, title: '' });
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // ダイアログ状態
  const [showBatchGenerationDialog, setShowBatchGenerationDialog] = useState(false);
  const [batchGenerationConfig, setBatchGenerationConfig] = useState({
    includeHighPriority: true,
    includeMediumPriority: true,
    includeLowPriority: false,
    maxSuggestions: 50
  });

  useEffect(() => {
    if (rewriteSuggestions.length > 0 && activeStep < 3) {
      setActiveStep(3);
    }
  }, [rewriteSuggestions, activeStep]);

  const handleImportComplete = (report: ImportedQualityReport) => {
    setImportedReport(report);
    setActiveStep(1);
    setError(null);
  };

  const handleGenerateSuggestions = async () => {
    if (!importedReport || !currentSite || !config?.geminiApiKey) {
      setError('必要な設定が不足しています。APIキーとサイト情報を確認してください。');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      
      const apiKey = config.geminiApiKey;
      
      // 高優先度の記事から順に処理
      const highPriorityResults = importedReport.results
        .filter(result => result.priority === 'high')
        .slice(0, 10); // 最初は10件に制限

      if (highPriorityResults.length === 0) {
        setError('リライト提案を生成する高優先度の記事が見つかりません。');
        return;
      }

      const suggestions = await rewriteSuggestionService.generateBatchSuggestions(
        highPriorityResults,
        currentSite,
        apiKey,
        (progress, currentTitle) => {
          setGenerationProgress({
            current: Math.round((progress / 100) * highPriorityResults.length),
            total: highPriorityResults.length,
            title: currentTitle
          });
        }
      );

      setRewriteSuggestions(suggestions);
      setActiveStep(2);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      setError(`リライト提案の生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBatchGeneration = async () => {
    if (!importedReport || !currentSite || !config?.geminiApiKey) return;

    try {
      setIsGenerating(true);
      setShowBatchGenerationDialog(false);
      
      const apiKey = config.geminiApiKey;
      
      // フィルタリング条件に基づいて対象記事を選択
      const filteredResults = importedReport.results.filter(result => {
        if (result.priority === 'high' && batchGenerationConfig.includeHighPriority) return true;
        if (result.priority === 'medium' && batchGenerationConfig.includeMediumPriority) return true;
        if (result.priority === 'low' && batchGenerationConfig.includeLowPriority) return true;
        return false;
      }).slice(0, batchGenerationConfig.maxSuggestions);

      const suggestions = await rewriteSuggestionService.generateBatchSuggestions(
        filteredResults,
        currentSite,
        apiKey,
        (progress, currentTitle) => {
          setGenerationProgress({
            current: Math.round((progress / 100) * filteredResults.length),
            total: filteredResults.length,
            title: currentTitle
          });
        }
      );

      setRewriteSuggestions(prev => [...prev, ...suggestions]);
    } catch (error) {
      console.error('Batch generation failed:', error);
      setError(`バッチ生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestionUpdate = (updatedSuggestion: RewriteSuggestion) => {
    setRewriteSuggestions(prev => 
      prev.map(s => s.id === updatedSuggestion.id ? updatedSuggestion : s)
    );
  };

  const handleBatchApproval = (
    action: 'approve_all' | 'reject_all',
    filterCriteria?: { priority?: 'high' | 'medium' | 'low'; type?: string }
  ) => {
    const currentSuggestion = rewriteSuggestions[selectedSuggestionIndex];
    if (!currentSuggestion) return;

    const updatedSuggestion = { ...currentSuggestion };
    
    currentSuggestion.suggestions.forEach(suggestion => {
      // フィルタ条件に一致する提案のみ処理
      if (filterCriteria?.priority && suggestion.priority !== filterCriteria.priority) return;
      if (filterCriteria?.type && suggestion.type !== filterCriteria.type) return;
      
      const status = action === 'approve_all' ? 'approved' : 'rejected';
      updatedSuggestion.approvalState.individualApprovals[suggestion.id] = {
        status,
        modifiedAt: new Date().toISOString()
      };
    });

    // 全体ステータスの更新
    const allStatuses = Object.values(updatedSuggestion.approvalState.individualApprovals);
    const approvedCount = allStatuses.filter(a => ['approved', 'modified'].includes(a.status)).length;
    const rejectedCount = allStatuses.filter(a => a.status === 'rejected').length;
    const totalCount = updatedSuggestion.suggestions.length;

    if (approvedCount === totalCount) {
      updatedSuggestion.approvalState.overallStatus = 'fully_approved';
    } else if (rejectedCount === totalCount) {
      updatedSuggestion.approvalState.overallStatus = 'rejected';
    } else if (approvedCount > 0 || rejectedCount > 0) {
      updatedSuggestion.approvalState.overallStatus = 'partially_approved';
    }

    handleSuggestionUpdate(updatedSuggestion);
  };

  const handleGenerateComparison = async () => {
    if (!currentSite) return;

    try {
      const comparisons: BeforeAfterContent[] = [];
      
      for (const suggestion of rewriteSuggestions) {
        // 記事の元コンテンツを取得（実際の実装では WordPress REST API を使用）
        const originalContent = {
          title: suggestion.postTitle,
          content: '元の記事内容...', // 実際には API から取得
          metaDescription: '元のメタディスクリプション...', // 実際には API から取得
        };
        
        const comparison = await rewriteSuggestionService.generateBeforeAfterContent(
          suggestion,
          originalContent
        );
        
        comparisons.push(comparison);
      }
      
      setBeforeAfterContents(comparisons);
      setActiveStep(3);
    } catch (error) {
      console.error('Failed to generate comparison:', error);
      setError('比較データの生成に失敗しました。');
    }
  };

  const handleExportFinal = async () => {
    try {
      const csvContent = await rewriteSuggestionService.exportFinalContent(beforeAfterContents);
      
      // CSV ダウンロード
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `リライト結果_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setActiveStep(4);
    } catch (error) {
      console.error('Export failed:', error);
      setError('エクスポートに失敗しました。');
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <CSVImporter
            onImportComplete={handleImportComplete}
            disabled={isGenerating}
          />
        );

      case 1:
        return (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                リライト提案の生成
              </Typography>
              
              {importedReport && (
                <Box sx={{ mb: 3 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    インポートされた品質チェック結果: {importedReport.results.length} 件の記事
                  </Alert>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="error">
                          {importedReport.results.filter(r => r.priority === 'high').length}
                        </Typography>
                        <Typography variant="caption">高優先度</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="warning">
                          {importedReport.results.filter(r => r.priority === 'medium').length}
                        </Typography>
                        <Typography variant="caption">中優先度</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="h6" color="info">
                          {importedReport.results.filter(r => r.priority === 'low').length}
                        </Typography>
                        <Typography variant="caption">低優先度</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {isGenerating && (
                <Box sx={{ mb: 3 }}>
                  <LinearProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    処理中: {generationProgress.current}/{generationProgress.total} - {generationProgress.title}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={isGenerating ? <CircularProgress size={20} /> : <SuggestIcon />}
                  onClick={handleGenerateSuggestions}
                  disabled={!importedReport || isGenerating || !currentSite}
                >
                  {isGenerating ? '生成中...' : '高優先度記事の提案生成'}
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={() => setShowBatchGenerationDialog(true)}
                  disabled={!importedReport || isGenerating}
                >
                  詳細設定でバッチ生成
                </Button>
              </Box>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Box>
            {rewriteSuggestions.length > 0 && (
              <Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs 
                    value={tabValue} 
                    onChange={(_, newValue) => setTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {rewriteSuggestions.map((suggestion, index) => (
                      <Tab 
                        key={suggestion.id}
                        label={`記事 ${suggestion.postId}`}
                        onClick={() => setSelectedSuggestionIndex(index)}
                      />
                    ))}
                  </Tabs>
                </Box>
                
                {rewriteSuggestions[selectedSuggestionIndex] && (
                  <SuggestionEditor
                    rewriteSuggestion={rewriteSuggestions[selectedSuggestionIndex]}
                    onSuggestionUpdate={handleSuggestionUpdate}
                    onBatchApproval={handleBatchApproval}
                  />
                )}
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<CompareIcon />}
                    onClick={handleGenerateComparison}
                    disabled={rewriteSuggestions.every(s => s.approvalState.overallStatus === 'pending')}
                  >
                    比較プレビューを生成
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            {beforeAfterContents.length > 0 && (
              <Box>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                  <Tabs 
                    value={tabValue} 
                    onChange={(_, newValue) => setTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                  >
                    {beforeAfterContents.map((content, index) => (
                      <Tab 
                        key={content.id}
                        label={`記事 ${content.postId}`}
                      />
                    ))}
                  </Tabs>
                </Box>
                
                <TabPanel value={tabValue} index={tabValue}>
                  {beforeAfterContents[tabValue] && (
                    <BeforeAfterComparison 
                      content={beforeAfterContents[tabValue]}
                      rewriteSuggestion={rewriteSuggestions.find(s => s.postId === beforeAfterContents[tabValue].postId)}
                    />
                  )}
                </TabPanel>
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={<ExportIcon />}
                    onClick={handleExportFinal}
                  >
                    最終結果をエクスポート
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );

      case 4:
        return (
          <Card>
            <CardContent>
              <Alert severity="success">
                <Typography variant="h6">
                  エクスポートが完了しました！
                </Typography>
                <Typography variant="body2">
                  リライト提案の結果がCSVファイルとしてダウンロードされました。
                </Typography>
              </Alert>
              
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setActiveStep(0);
                    setImportedReport(null);
                    setRewriteSuggestions([]);
                    setBeforeAfterContents([]);
                    setTabValue(0);
                  }}
                >
                  新しいプロジェクトを開始
                </Button>
              </Box>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          自動リライト提案
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          品質チェック結果をインポートして、AIによる具体的なリライト提案を生成・編集できます。
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel>
                  <Typography variant="h6">{step.label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  
                  <Box>{renderStepContent(index)}</Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* フローティングアクションボタン */}
        {activeStep > 0 && (
          <Fab
            color="primary"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
          >
            <RefreshIcon />
          </Fab>
        )}

        {/* バッチ生成設定ダイアログ */}
        <Dialog
          open={showBatchGenerationDialog}
          onClose={() => setShowBatchGenerationDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>バッチ生成設定</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              リライト提案を生成する記事の条件を設定してください。
            </Typography>
            
            {/* 設定UI は省略（実装時に追加） */}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowBatchGenerationDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleBatchGeneration} variant="contained">
              生成開始
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}