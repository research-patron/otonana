import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Alert,
  Divider,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Download as DownloadIcon,
  InsertDriveFile as FileIcon,
  TableChart as TableIcon
} from '@mui/icons-material';
import type { QualityCheckReport, CSVExportOptions } from '../../types';

interface ReportGeneratorProps {
  report: QualityCheckReport;
  onExport?: (options: CSVExportOptions) => Promise<void>;
  disabled?: boolean;
}

export default function ReportGenerator({
  report,
  onExport,
  disabled = false
}: ReportGeneratorProps) {
  const [exportOptions, setExportOptions] = useState<CSVExportOptions>({
    format: 'csv',
    includeMetadata: true,
    includeAnalysis: true,
    filterByStatus: ['publish', 'draft', 'private', 'pending', 'future']
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleExport = async () => {
    if (!onExport) return;

    setIsExporting(true);
    try {
      await onExport(exportOptions);
      setExportMessage({ type: 'success', text: 'レポートのエクスポートが完了しました' });
    } catch (error) {
      setExportMessage({ 
        type: 'error', 
        text: `エクスポートに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const generateCSVContent = (): string => {
    const headers = [
      '記事ID',
      'タイトル',
      'URL',
      'ステータス',
      '総合スコア',
      '古さスコア',
      'AI文章スコア',
      '誤情報リスクスコア',
      '優先度',
      'カテゴリー',
      '最終更新日',
      'リライト推奨理由',
      '推奨アクション',
      '処理時間(ms)',
      'チェック実行日時'
    ];

    if (exportOptions.includeAnalysis) {
      headers.push(
        'TextLintエラー数',
        'TextLintメッセージ',
        '誤情報検出問題',
        '古い情報',
        '論理的矛盾',
        'SEO推奨事項',
        '読みやすさ改善案'
      );
    }

    const csvRows = [headers.join(',')];

    const filteredResults = report.results.filter(result => 
      exportOptions.filterByStatus?.includes(result.status) ?? true
    );

    filteredResults.forEach(result => {
      const row = [
        result.postId.toString(),
        `"${result.title.replace(/"/g, '""')}"`,
        result.url,
        result.status,
        result.overallScore.toString(),
        result.ageScore.toString(),
        result.aiTextScore.toString(),
        result.misinformationScore.toString(),
        result.priority,
        `"${result.categories.map(c => c.name).join(', ')}"`,
        new Date(result.lastModified).toISOString().split('T')[0],
        `"${result.rewriteReasons.join('; ').replace(/"/g, '""')}"`,
        `"${result.recommendedActions.join('; ').replace(/"/g, '""')}"`,
        result.processingTime.toString(),
        new Date(result.checkedAt).toISOString().replace('T', ' ').split('.')[0]
      ];

      if (exportOptions.includeAnalysis) {
        row.push(
          result.textlintResult.messages.length.toString(),
          `"${result.textlintResult.messages.map(m => `${m.ruleId}: ${m.message}`).join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.misinformationRisk.issues.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.recencyCheck.outdatedInfo.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.logicalConsistency.inconsistencies.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.seoAnalysis.recommendations.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.readabilityScore.suggestions.join('; ').replace(/"/g, '""')}"`
        );
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const downloadCSV = () => {
    const csvContent = generateCSVContent();
    
    // ファイル名を生成（日時を含む）
    const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const currentTime = new Date().toISOString().split('T')[1].slice(0, 5).replace(':', '');
    const fileName = report.fileName || `品質チェック_${currentDate}_${currentTime}.csv`;
    
    // BOM付きでCSVをダウンロード（Excel対応）
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      throw new Error('ブラウザがファイルダウンロードをサポートしていません');
    }
  };

  const handleDirectDownload = async () => {
    setIsExporting(true);
    setExportMessage(null);
    
    try {
      // 少し遅延を追加してユーザーエクスペリエンスを向上
      await new Promise(resolve => setTimeout(resolve, 100));
      
      downloadCSV();
      
      setExportMessage({ 
        type: 'success', 
        text: `CSVファイル（${report.results.filter(r => 
          exportOptions.filterByStatus?.includes(r.status) ?? true
        ).length}件）のダウンロードが完了しました` 
      });
    } catch (error) {
      console.error('Direct download failed:', error);
      setExportMessage({ 
        type: 'error', 
        text: `ダウンロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}` 
      });
    } finally {
      setIsExporting(false);
    }
  };

  const previewData = report.results.slice(0, 3);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          レポート生成・エクスポート
        </Typography>

        <Grid container spacing={3}>
          {/* エクスポート設定 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">エクスポート形式</FormLabel>
                <RadioGroup
                  value={exportOptions.format}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                >
                  <FormControlLabel 
                    value="csv" 
                    control={<Radio />} 
                    label="CSV形式"
                    disabled={disabled || isExporting}
                  />
                  <FormControlLabel 
                    value="json" 
                    control={<Radio />} 
                    label="JSON形式" 
                    disabled={disabled || isExporting}
                  />
                </RadioGroup>
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormLabel component="legend">含める情報</FormLabel>
              <Box sx={{ mt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeMetadata}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeMetadata: e.target.checked 
                      }))}
                      disabled={disabled || isExporting}
                    />
                  }
                  label="メタデータ（記事URL、カテゴリー等）"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeAnalysis}
                      onChange={(e) => setExportOptions(prev => ({ 
                        ...prev, 
                        includeAnalysis: e.target.checked 
                      }))}
                      disabled={disabled || isExporting}
                    />
                  }
                  label="詳細分析結果（TextLint、Gemini分析）"
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormLabel component="legend">対象記事ステータス</FormLabel>
              <Box sx={{ mt: 1 }}>
                {(['publish', 'draft', 'private', 'pending', 'future'] as const).map(status => (
                  <FormControlLabel
                    key={status}
                    control={
                      <Checkbox
                        checked={exportOptions.filterByStatus?.includes(status) ?? true}
                        onChange={(e) => {
                          const newStatuses = e.target.checked
                            ? [...(exportOptions.filterByStatus || []), status]
                            : (exportOptions.filterByStatus || []).filter(s => s !== status);
                          setExportOptions(prev => ({ 
                            ...prev, 
                            filterByStatus: newStatuses 
                          }));
                        }}
                        disabled={disabled || isExporting}
                      />
                    }
                    label={status}
                  />
                ))}
              </Box>
            </Box>
          </Grid>

          {/* プレビュー */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              エクスポートプレビュー
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              以下は最初の3件のサンプルです。実際のエクスポートには全{report.results.length}件が含まれます。
            </Alert>

            <Box sx={{ 
              maxHeight: 300, 
              overflow: 'auto', 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1,
              p: 1,
              bgcolor: 'grey.50'
            }}>
              <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                {generateCSVContent().split('\n').slice(0, 4).join('\n')}
                {report.results.length > 3 && '\n...'}
              </Typography>
            </Box>
          </Grid>

          {/* 統計情報 */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              エクスポート統計
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      対象記事数
                    </Typography>
                    <Typography variant="h6">
                      {report.results.filter(r => 
                        exportOptions.filterByStatus?.includes(r.status) ?? true
                      ).length}
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
                      {report.results.filter(r => 
                        r.priority === 'high' && 
                        (exportOptions.filterByStatus?.includes(r.status) ?? true)
                      ).length}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      推定ファイルサイズ
                    </Typography>
                    <Typography variant="h6">
                      {Math.round(generateCSVContent().length / 1024)}KB
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={3}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      生成日時
                    </Typography>
                    <Typography variant="body2">
                      {new Date(report.generatedAt).toLocaleDateString('ja-JP', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* エクスポートボタン */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
                onClick={handleDirectDownload}
                disabled={disabled || isExporting}
              >
                {isExporting ? 'ダウンロード中...' : 'CSVダウンロード'}
              </Button>
              
              {onExport && (
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={isExporting ? <CircularProgress size={20} /> : <FileIcon />}
                  onClick={handleExport}
                  disabled={disabled || isExporting}
                >
                  {isExporting ? 'エクスポート中...' : 'カスタムエクスポート'}
                </Button>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              ファイル名: {report.fileName}
            </Typography>
          </Grid>
        </Grid>

        {/* 成功・エラーメッセージ */}
        <Snackbar
          open={!!exportMessage}
          autoHideDuration={6000}
          onClose={() => setExportMessage(null)}
          message={exportMessage?.text}
        />
      </CardContent>
    </Card>
  );
}