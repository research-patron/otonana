import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import {
  processFile,
  validateFile,
  getSupportedExtensions,
  type FileProcessingResult,
} from '../../services/fileProcessor';
import { formatFileSize } from '../../utils/textProcessor';

interface FileUploaderProps {
  onFileProcessed: (result: FileProcessingResult) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
}

interface FileState {
  file: File;
  processing: boolean;
  processed: boolean;
  error?: string;
  result?: FileProcessingResult;
}

function FileUploader({
  onFileProcessed,
  onError,
  disabled = false,
  maxFiles = 5,
}: FileUploaderProps) {
  const [files, setFiles] = useState<Map<string, FileState>>(new Map());
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // ファイルを追加
  const addFile = useCallback((file: File) => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    setFiles(prev => new Map(prev.set(fileId, {
      file,
      processing: false,
      processed: false,
    })));
    return fileId;
  }, []);

  // ファイル処理
  const processFileAsync = useCallback(async (fileId: string, file: File) => {
    setFiles(prev => {
      const newFiles = new Map(prev);
      const fileState = newFiles.get(fileId);
      if (fileState) {
        newFiles.set(fileId, { ...fileState, processing: true });
      }
      return newFiles;
    });

    try {
      const result = await processFile(file);
      
      setFiles(prev => {
        const newFiles = new Map(prev);
        const fileState = newFiles.get(fileId);
        if (fileState) {
          newFiles.set(fileId, {
            ...fileState,
            processing: false,
            processed: true,
            result,
            error: result.error,
          });
        }
        return newFiles;
      });

      if (result.error) {
        onError(`${file.name}: ${result.error}`);
      } else {
        onFileProcessed(result);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ファイル処理中にエラーが発生しました';
      
      setFiles(prev => {
        const newFiles = new Map(prev);
        const fileState = newFiles.get(fileId);
        if (fileState) {
          newFiles.set(fileId, {
            ...fileState,
            processing: false,
            processed: true,
            error: errorMessage,
          });
        }
        return newFiles;
      });

      onError(`${file.name}: ${errorMessage}`);
    }
  }, [onFileProcessed, onError]);

  // ファイルドロップ処理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) return;

    // ファイル数制限チェック
    const currentFileCount = files.size;
    const totalFiles = currentFileCount + acceptedFiles.length;
    if (totalFiles > maxFiles) {
      onError(`ファイル数が上限（${maxFiles}個）を超えています`);
      return;
    }

    // 各ファイルを処理
    acceptedFiles.forEach(file => {
      // ファイルバリデーション
      const validation = validateFile(file);
      if (!validation.valid) {
        onError(`${file.name}: ${validation.error}`);
        return;
      }

      // ファイル追加と処理開始
      const fileId = addFile(file);
      processFileAsync(fileId, file);
    });
  }, [disabled, files.size, maxFiles, onError, addFile, processFileAsync]);

  // ファイル削除
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const newFiles = new Map(prev);
      newFiles.delete(fileId);
      return newFiles;
    });
  }, []);

  // ドロップゾーン設定
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'text/html': ['.html', '.htm'],
    },
    maxFiles,
  });

  const fileArray = Array.from(files.entries());
  const processingCount = fileArray.filter(([, state]) => state.processing).length;
  const supportedExts = getSupportedExtensions();

  return (
    <Box>
      {/* ドロップゾーン */}
      <Paper
        {...getRootProps()}
        elevation={isDragActive ? 4 : 1}
        sx={{
          p: 3,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          bgcolor: isDragActive ? 'primary.50' : 'background.paper',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: disabled ? 'grey.300' : 'primary.main',
            bgcolor: disabled ? 'background.paper' : 'primary.50',
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        
        {isDragActive ? (
          <Typography variant="h6" color="primary">
            ファイルをドロップしてください
          </Typography>
        ) : (
          <>
            <Typography variant="h6" gutterBottom>
              ファイルをドラッグ&ドロップまたはクリックして選択
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              対応形式: {supportedExts.join(', ')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              最大{maxFiles}ファイル、1ファイルあたり10MBまで
            </Typography>
          </>
        )}
        
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          sx={{ mt: 2 }}
          disabled={disabled}
        >
          ファイルを選択
        </Button>
      </Paper>

      {/* 処理進行状況 */}
      {processingCount > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {processingCount}個のファイルを処理中...
          </Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {/* ファイルリスト */}
      {fileArray.length > 0 && (
        <Paper elevation={1} sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
            アップロードファイル ({fileArray.length})
          </Typography>
          
          <List dense>
            {fileArray.map(([fileId, state]) => (
              <React.Fragment key={fileId}>
                <ListItem>
                  <ListItemIcon>
                    {state.processing ? (
                      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <LinearProgress 
                          variant="indeterminate" 
                          sx={{ width: 24, height: 24, borderRadius: '50%' }}
                        />
                      </Box>
                    ) : state.error ? (
                      <ErrorIcon color="error" />
                    ) : state.processed ? (
                      <SuccessIcon color="success" />
                    ) : (
                      <FileIcon />
                    )}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {state.file.name}
                        </Typography>
                        <Chip
                          label={formatFileSize(state.file.size)}
                          size="small"
                          variant="outlined"
                        />
                        {state.result && (
                          <Chip
                            label={`${state.result.content.wordCount}文字`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      state.processing ? '処理中...' :
                      state.error ? state.error :
                      state.result ? `処理完了 (${state.result.processingTime}ms)` :
                      '待機中'
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {state.result && !state.error && (
                        <IconButton
                          size="small"
                          onClick={() => setShowDetails(showDetails === fileId ? null : fileId)}
                        >
                          {showDetails === fileId ? <CollapseIcon /> : <ExpandIcon />}
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => removeFile(fileId)}
                        disabled={state.processing}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {/* ファイル詳細 */}
                <Collapse in={showDetails === fileId} timeout="auto" unmountOnExit>
                  {state.result && !state.error && (
                    <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                      <Typography variant="caption" color="text.secondary" paragraph>
                        構造: {state.result.content.structure}
                      </Typography>
                      
                      {state.result.content.headings.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            見出し:
                          </Typography>
                          {state.result.content.headings.slice(0, 3).map((heading, index) => (
                            <Chip
                              key={index}
                              label={`H${heading.level}: ${heading.text.slice(0, 20)}...`}
                              size="small"
                              variant="outlined"
                              sx={{ ml: 0.5, mt: 0.5 }}
                            />
                          ))}
                          {state.result.content.headings.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              {' '}他{state.result.content.headings.length - 3}個
                            </Typography>
                          )}
                        </Box>
                      )}
                      
                      {state.result.content.keywords.length > 0 && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            キーワード:
                          </Typography>
                          {state.result.content.keywords.slice(0, 5).map((keyword, index) => (
                            <Chip
                              key={index}
                              label={keyword}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 0.5, mt: 0.5 }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}
                </Collapse>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default FileUploader;