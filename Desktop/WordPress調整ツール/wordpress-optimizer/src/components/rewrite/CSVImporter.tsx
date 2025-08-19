import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Alert,
  LinearProgress,
  Grid,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Upload as UploadIcon,
  GetApp as ImportIcon,
  Visibility as PreviewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import type { 
  CSVImportConfig, 
  CSVImportResult, 
  ImportedQualityReport 
} from '../../types';
import { csvImporterService } from '../../services/csvImporter';

interface CSVImporterProps {
  onImportComplete: (report: ImportedQualityReport) => void;
  disabled?: boolean;
}

const defaultConfig: CSVImportConfig = {
  fileEncoding: 'UTF-8',
  delimiter: 'auto',
  hasHeader: true,
  skipEmptyLines: true,
  columnMapping: {
    postId: '記事ID',
    title: 'タイトル',
    url: 'URL',
    status: 'ステータス',
    overallScore: '総合スコア',
    rewriteReasons: 'リライト推奨理由',
    recommendedActions: '推奨アクション'
  }
};

export default function CSVImporter({ onImportComplete, disabled = false }: CSVImporterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [config, setConfig] = useState<CSVImportConfig>(defaultConfig);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<CSVImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setImportResult(null);
      setPreviewData([]);
    } else if (file) {
      alert('CSVファイルを選択してください。');
    }
  }, []);

  const handlePreview = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      // プレビュー用に最初の数行のみ読み込み
      const content = await readFileAsText(selectedFile, config.fileEncoding);
      const lines = content.split('\\n').slice(0, 10);
      const delimiter = config.delimiter === 'auto' ? detectDelimiter(lines[0]) : config.delimiter;
      
      const previewRows = lines
        .filter(line => config.skipEmptyLines ? line.trim().length > 0 : true)
        .map((line, index) => ({
          rowNumber: index + 1,
          rawData: line,
          parsedData: parseLine(line, delimiter)
        }));

      setPreviewData(previewRows);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('ファイルのプレビューに失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      const result = await csvImporterService.importCSV(selectedFile, config);
      setImportResult(result);

      if (result.isSuccess && result.importedReport) {
        onImportComplete(result.importedReport);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        isSuccess: false,
        errors: [error instanceof Error ? error.message : '不明なエラーが発生しました'],
        warnings: [],
        stats: { totalRows: 0, successfulRows: 0, skippedRows: 0, errorRows: 0 },
        dataQuality: { duplicateEntries: 0, missingRequiredFields: [], invalidDataTypes: [] }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsText = (file: File, encoding: CSVImportConfig['fileEncoding']): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      
      if (encoding === 'UTF-8' || encoding === 'auto') {
        reader.readAsText(file, 'UTF-8');
      } else {
        reader.readAsText(file, encoding);
      }
    });
  };

  const detectDelimiter = (line: string): ',' | ';' | '\\t' => {
    const delimiters = [',', ';', '\\t'];
    const counts = delimiters.map(delimiter => 
      (line.match(new RegExp('\\\\' + delimiter, 'g')) || []).length
    );
    const maxIndex = counts.indexOf(Math.max(...counts));
    return delimiters[maxIndex] as ',' | ';' | '\\t';
  };

  const parseLine = (line: string, delimiter: string): string[] => {
    return line.split(delimiter).map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
  };

  const resetImporter = () => {
    setSelectedFile(null);
    setImportResult(null);
    setPreviewData([]);
    setShowPreview(false);
    setConfig(defaultConfig);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          品質チェック結果のインポート
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          過去にエクスポートした品質チェック結果のCSVファイルをインポートして、
          リライト提案機能を使用することができます。
        </Typography>

        <Box sx={{ mb: 3 }}>
          <input
            accept=".csv"
            style={{ display: 'none' }}
            id="csv-file-input"
            type="file"
            onChange={handleFileSelect}
            disabled={disabled || isProcessing}
          />
          <label htmlFor="csv-file-input">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadIcon />}
              disabled={disabled || isProcessing}
              fullWidth
            >
              CSVファイルを選択
            </Button>
          </label>
          
          {selectedFile && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>選択されたファイル:</strong> {selectedFile.name}<br />
                  <strong>サイズ:</strong> {(selectedFile.size / 1024).toFixed(1)} KB<br />
                  <strong>最終更新:</strong> {new Date(selectedFile.lastModified).toLocaleDateString()}
                </Typography>
              </Alert>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={isProcessing}
                >
                  プレビュー
                </Button>
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowConfig(true)}
                  disabled={isProcessing}
                >
                  設定変更
                </Button>
                
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isProcessing ? <CircularProgress size={16} /> : <ImportIcon />}
                  onClick={handleImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'インポート中...' : 'インポート実行'}
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {isProcessing && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {showPreview ? 'プレビューを準備中...' : 'CSVファイルをインポート中...'}
            </Typography>
          </Box>
        )}

        {/* インポート結果の表示 */}
        {importResult && (
          <Box sx={{ mb: 3 }}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              インポート結果
            </Typography>
            
            <Alert 
              severity={importResult.isSuccess ? 'success' : 'error'} 
              icon={importResult.isSuccess ? <SuccessIcon /> : <ErrorIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {importResult.isSuccess 
                  ? `インポートが完了しました。${importResult.stats.successfulRows}件のデータを正常に読み込みました。`
                  : 'インポートに失敗しました。'}
              </Typography>
            </Alert>

            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6">{importResult.stats.totalRows}</Typography>
                  <Typography variant="caption">総行数</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    {importResult.stats.successfulRows}
                  </Typography>
                  <Typography variant="caption">成功</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="warning.main">
                    {importResult.stats.skippedRows}
                  </Typography>
                  <Typography variant="caption">スキップ</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="error.main">
                    {importResult.stats.errorRows}
                  </Typography>
                  <Typography variant="caption">エラー</Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* エラー・警告の表示 */}
            {importResult.errors.length > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>エラー:</strong>
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {importResult.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {importResult.warnings.length > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>警告:</strong>
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {importResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {importResult.isSuccess && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  onClick={resetImporter}
                >
                  新しいファイルをインポート
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* プレビューダイアログ */}
        <Dialog
          open={showPreview}
          onClose={() => setShowPreview(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>CSVファイル プレビュー</DialogTitle>
          <DialogContent>
            {previewData.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>行番号</TableCell>
                      <TableCell>データ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewData.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {row.parsedData.map((cell: string, index: number) => (
                              <Chip 
                                key={index} 
                                label={cell || '(空)'} 
                                size="small" 
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPreview(false)}>閉じる</Button>
          </DialogActions>
        </Dialog>

        {/* 設定ダイアログ */}
        <Dialog
          open={showConfig}
          onClose={() => setShowConfig(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>インポート設定</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">文字エンコーディング</FormLabel>
                <RadioGroup
                  value={config.fileEncoding}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    fileEncoding: e.target.value as CSVImportConfig['fileEncoding']
                  }))}
                >
                  <FormControlLabel value="UTF-8" control={<Radio />} label="UTF-8" />
                  <FormControlLabel value="Shift_JIS" control={<Radio />} label="Shift_JIS" />
                  <FormControlLabel value="auto" control={<Radio />} label="自動検出" />
                </RadioGroup>
              </FormControl>

              <FormControl component="fieldset" sx={{ mb: 3 }}>
                <FormLabel component="legend">区切り文字</FormLabel>
                <RadioGroup
                  value={config.delimiter}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    delimiter: e.target.value as CSVImportConfig['delimiter']
                  }))}
                >
                  <FormControlLabel value="," control={<Radio />} label="カンマ (,)" />
                  <FormControlLabel value=";" control={<Radio />} label="セミコロン (;)" />
                  <FormControlLabel value="\t" control={<Radio />} label="タブ" />
                  <FormControlLabel value="auto" control={<Radio />} label="自動検出" />
                </RadioGroup>
              </FormControl>

              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.hasHeader}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        hasHeader: e.target.checked 
                      }))}
                    />
                  }
                  label="1行目をヘッダーとして扱う"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.skipEmptyLines}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        skipEmptyLines: e.target.checked 
                      }))}
                    />
                  }
                  label="空行をスキップする"
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfig(false)}>閉じる</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}