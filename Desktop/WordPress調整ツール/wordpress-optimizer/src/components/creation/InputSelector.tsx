import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Grid,
  TextField,
  Alert,
  Fade,
  Divider,
  FormControlLabel,
  Switch,
  Chip,
  Paper,
  IconButton,
  alpha,
} from '@mui/material';
import {
  CloudUpload as FileIcon,
  Edit as TextIcon,
  ArrowForward as NextIcon,
  Info as InfoIcon,
  Clear as ClearIcon,
  DragIndicator as DragIcon,
  Refresh as RefreshIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { processFile, validateFile } from '../../services/fileProcessor';
import type { FileProcessingResult } from '../../services/fileProcessor';

export type InputMode = 'file' | 'text' | 'none';

export interface InputSelectorProps {
  onInputReady: (input: string, fileContent?: FileProcessingResult) => void;
  onModeChange?: (mode: InputMode) => void;
  onRestartAnalysis?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  hasExistingCSVData?: boolean;
}

function InputSelector({
  onInputReady,
  onModeChange,
  onRestartAnalysis,
  isLoading = false,
  disabled = false,
  hasExistingCSVData = false,
}: InputSelectorProps) {
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [textInput, setTextInput] = useState('');
  const [fileContent, setFileContent] = useState<FileProcessingResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleModeSelect = (mode: InputMode) => {
    setInputMode(mode);
    if (mode === 'text') {
      setFileContent(null);
    } else if (mode === 'file') {
      setTextInput('');
    } else {
      setTextInput('');
      setFileContent(null);
    }
    setError(null);
    onModeChange?.(mode);
  };

  // テキスト入力の変更を監視
  const handleTextChange = (value: string) => {
    setTextInput(value);
    if (value.trim().length > 0 && inputMode !== 'text') {
      handleModeSelect('text');
    } else if (value.trim().length === 0 && inputMode === 'text') {
      handleModeSelect('none');
    }
  };

  // ファイル処理
  const handleFileProcessed = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    setIsProcessing(true);
    setError(null);
    
    try {
      // ファイルバリデーション
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error || 'ファイルが無効です');
      }
      
      // ファイル処理
      const result = await processFile(file);
      setFileContent(result);
      handleModeSelect('file');
      
    } catch (error) {
      console.error('File processing error:', error);
      setError(error instanceof Error ? error.message : 'ファイル処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // ドラッグ&ドロップ設定
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleFileProcessed,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md', '.markdown'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
    },
    multiple: false,
    disabled: isLoading || disabled || isProcessing,
    noClick: true, // クリックでファイル選択を無効化
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => {
      setIsDragging(false);
      setError('対応していないファイル形式です。対応形式: .txt, .md, .pdf, .docx, .doc');
    },
  });

  // クリアハンドラー
  const handleClear = () => {
    setTextInput('');
    setFileContent(null);
    setError(null);
    handleModeSelect('none');
  };

  const handleNext = () => {
    if (inputMode === 'file' && fileContent) {
      // ファイル内容とテキストを組み合わせて送信
      const combinedInput = textInput.trim() 
        ? `${textInput}\n\n追加情報:\nキーワード: ${keywords}\nターゲット: ${targetAudience}`
        : `キーワード: ${keywords}\nターゲット: ${targetAudience}` || 'ファイル内容を分析して記事を作成してください。';
      onInputReady(combinedInput, fileContent);
    } else if (inputMode === 'text' && textInput.trim()) {
      // テキスト入力の場合
      const enhancedInput = showAdvanced 
        ? `${textInput}\n\n追加情報:\nキーワード: ${keywords}\nターゲット: ${targetAudience}`
        : textInput;
      onInputReady(enhancedInput);
    }
  };

  const canProceed = () => {
    if (inputMode === 'file') {
      return fileContent !== null;
    } else if (inputMode === 'text') {
      return textInput.trim().length > 0;
    }
    return false;
  };

  const getWordCount = () => {
    if (inputMode === 'file' && fileContent) {
      return fileContent.content.wordCount;
    } else if (inputMode === 'text') {
      return textInput.length;
    }
    return 0;
  };

  return (
    <Box 
      sx={{ 
        maxWidth: 1000, 
        mx: 'auto', 
        p: 2,
        position: 'relative',
        minHeight: '70vh',
      }}
    >
      {/* ドラッグ&ドロップエリア（画面全体 - 初期状態のみ） */}
      {inputMode === 'none' && (
        <Box
          {...getRootProps()}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            pointerEvents: 'auto', // ドラッグ&ドロップを有効化
          }}
        >
          <input {...getInputProps()} />
        </Box>
      )}
      
      {/* ドラッグビジュアルフィードバック */}
      {(isDragActive || isDragging) && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: alpha('#1976d2', 0.1),
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            pointerEvents: 'none', // UI要素との干渉を防止
          }}
        >
          <Paper
            elevation={8}
            sx={{
              p: 4,
              textAlign: 'center',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 3,
            }}
          >
            <FileIcon sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              ファイルをドロップ
            </Typography>
            <Typography variant="body1">
              対応形式: Markdown, PDF, Word, テキスト
            </Typography>
          </Paper>
        </Box>
      )}
      
      {/* ヘッダー */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          記事作成を始めましょう
        </Typography>
        <Typography variant="body1" color="text.secondary">
          テキストを直接入力するか、ファイルをドラッグ&ドロップしてください
        </Typography>
      </Box>

      {/* CSV再分析オプション */}
      {hasExistingCSVData && onRestartAnalysis && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={onRestartAnalysis}
              disabled={isLoading || disabled}
            >
              カテゴリーから選び直す
            </Button>
          }
        >
          <Box>
            <Typography variant="body2" fontWeight="bold">
              既存の記事分析データを使用中
            </Typography>
            <Typography variant="caption" display="block">
              別のカテゴリーで記事分析をやり直したい場合は「カテゴリーから選び直す」をクリックしてください
            </Typography>
          </Box>
        </Alert>
      )}

      {/* メインテキスト入力エリア */}
      <Card elevation={2} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TextIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">
              記事のテーマ・要求事項を入力
            </Typography>
            {(inputMode === 'text' || textInput.trim()) && (
              <IconButton
                onClick={handleClear}
                size="small"
                sx={{ ml: 'auto' }}
                disabled={isLoading || disabled}
              >
                <ClearIcon />
              </IconButton>
            )}
          </Box>

          <TextField
            fullWidth
            multiline
            rows={8}
            label="記事のテーマ・要求事項"
            value={textInput}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={`記事のテーマや内容について詳しく教えてください。例：

・記事のテーマ: 「初心者向けのWordPress使い方ガイド」
・想定読者: WordPressを初めて使う人
・記事の目的: インストールから基本設定まで分かりやすく説明
・含めたい内容: インストール手順、初期設定、テーマの選び方、プラグインの導入
・記事の長さ: 3000文字程度

または、ファイルをこの画面にドラッグ&ドロップすることもできます。`}
            disabled={isLoading || disabled || isProcessing}
            sx={{ mb: 2 }}
          />

          {/* 高度な設定 */}
          <FormControlLabel
            control={
              <Switch
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
            }
            label="詳細設定"
            sx={{ mb: showAdvanced ? 2 : 0 }}
          />

          {showAdvanced && (
            <Fade in={showAdvanced}>
              <Box sx={{ pl: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ターゲットキーワード"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="SEO キーワード"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ターゲット読者"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="初心者、専門家など"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>
            </Fade>
          )}
        </CardContent>
        
        {inputMode === 'text' && (
          <>
            <Divider />
            <CardActions sx={{ p: 3, justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                文字数: {getWordCount().toLocaleString()} / 推奨: 100文字以上
              </Typography>
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={handleNext}
                disabled={!canProceed() || isLoading || disabled}
                size="large"
              >
                {isLoading ? 'AI提案生成中...' : 'AI提案を生成'}
              </Button>
            </CardActions>
          </>
        )}
      </Card>

      {/* ファイル処理結果表示 */}
      {inputMode === 'file' && fileContent && (
        <Fade in={true}>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <FileIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">ファイル処理完了</Typography>
                <IconButton
                  onClick={handleClear}
                  size="small"
                  sx={{ ml: 'auto' }}
                  disabled={isLoading || disabled}
                >
                  <ClearIcon />
                </IconButton>
              </Box>

              <Alert severity="success" icon={<InfoIcon />} sx={{ mb: 3 }}>
                <Typography variant="body2">
                  ファイル「{fileContent.filename}」を処理しました
                  （{fileContent.content.wordCount.toLocaleString()}文字）
                </Typography>
                {fileContent.content.keywords.length > 0 && (
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    検出されたキーワード: {fileContent.content.keywords.slice(0, 5).join(', ')}
                    {fileContent.content.keywords.length > 5 && '...'}
                  </Typography>
                )}
              </Alert>

              {/* 追加指示入力 */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="追加指示（オプション）"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="ファイルの内容をどのように記事化したいか、特別な要求があれば記入してください..."
                disabled={isLoading || disabled}
                sx={{ mb: 2 }}
              />

              {/* 高度な設定 */}
              <FormControlLabel
                control={
                  <Switch
                    checked={showAdvanced}
                    onChange={(e) => setShowAdvanced(e.target.checked)}
                  />
                }
                label="詳細設定"
                sx={{ mb: showAdvanced ? 2 : 0 }}
              />

              {showAdvanced && (
                <Fade in={showAdvanced}>
                  <Box sx={{ pl: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="ターゲットキーワード"
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                          placeholder="SEO キーワード"
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="ターゲット読者"
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="初心者、専門家など"
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </Fade>
              )}
            </CardContent>
            
            <Divider />
            
            <CardActions sx={{ p: 3, justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                文字数: {getWordCount().toLocaleString()}
              </Typography>
              <Button
                variant="contained"
                endIcon={<NextIcon />}
                onClick={handleNext}
                disabled={!canProceed() || isLoading || disabled}
                size="large"
              >
                {isLoading ? 'AI提案生成中...' : 'AI提案を生成'}
              </Button>
            </CardActions>
          </Card>
        </Fade>
      )}

      {/* ドラッグ&ドロップゾーン表示 */}
      {inputMode === 'none' && (
        <Card 
          {...getRootProps()}
          elevation={1} 
          sx={{ 
            mb: 4,
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: isDragActive ? 'primary.main' : 'divider',
            backgroundColor: isDragActive ? alpha('#1976d2', 0.1) : alpha('#1976d2', 0.02),
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: alpha('#1976d2', 0.05),
            },
          }}
        >
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <DragIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="text.secondary">
              ファイルをドラッグ&ドロップ
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              対応形式: Markdown (.md), PDF (.pdf), Word (.docx, .doc), テキスト (.txt)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mb: 3 }}>
              <Chip label="Markdown" size="small" variant="outlined" />
              <Chip label="PDF" size="small" variant="outlined" />
              <Chip label="Word" size="small" variant="outlined" />
              <Chip label="テキスト" size="small" variant="outlined" />
            </Box>
            <Button
              variant="outlined"
              startIcon={<FileIcon />}
              onClick={open}
              disabled={isLoading || disabled || isProcessing}
              size="large"
            >
              ファイルを選択
            </Button>
          </CardContent>
        </Card>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 処理中表示 */}
      {isProcessing && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            ファイルを処理しています...
          </Typography>
        </Alert>
      )}

      {/* ヒント表示 */}
      <Alert severity="info" icon={<InfoIcon />}>
        <Typography variant="body2">
          <strong>ヒント:</strong> 
          {inputMode === 'none' && 'テキストを入力するか、ファイルをドラッグ&ドロップして記事作成を始めましょう。'}
          {inputMode === 'text' && 'より良い記事を作成するために、テーマや要求事項をできるだけ詳しく記載してください。AIは詳細な情報があるほど、より適切で価値のある記事を生成できます。'}
          {inputMode === 'file' && 'ファイルの内容を基に記事を作成します。追加の指示があれば入力してください。'}
        </Typography>
      </Alert>
    </Box>
  );
}

export default InputSelector;