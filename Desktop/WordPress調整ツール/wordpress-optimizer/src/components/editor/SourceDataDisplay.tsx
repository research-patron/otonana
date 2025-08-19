import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Grid,
  Chip,
  Divider,
  Stack,
  Alert,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Description as FileIcon,
  Edit as TextIcon,
  Psychology as AIIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { DraftArticle } from '../../types';
import type { FileProcessingResult } from '../../services/fileProcessor';

interface SourceDataDisplayProps {
  draft?: Partial<DraftArticle> | null;
  originalInput?: string;
  fileContent?: FileProcessingResult | null;
}

function SourceDataDisplay({ draft, originalInput, fileContent }: SourceDataDisplayProps) {
  // draft から元データ情報を取得
  const sourceFile = draft?.sourceFile;
  const draftOriginalInput = draft?.originalInput;
  const fileMetadata = draft?.fileMetadata ? JSON.parse(draft.fileMetadata) : null;
  
  // 表示用の元入力データ（props優先）
  const displayOriginalInput = originalInput || draftOriginalInput;
  const displayFileContent = fileContent || (fileMetadata ? {
    filename: fileMetadata.filename,
    content: {
      wordCount: fileMetadata.wordCount,
      keywords: fileMetadata.keywords || [],
    }
  } : null);

  // 表示するデータがない場合は何も表示しない
  if (!displayOriginalInput && !displayFileContent && !sourceFile) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Accordion defaultExpanded={false}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          sx={{ 
            backgroundColor: 'action.hover',
            '&:hover': { backgroundColor: 'action.selected' }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            <Typography variant="h6">
              記事作成元情報
            </Typography>
            <Typography variant="caption" color="text.secondary">
              （記事作成時の元データ）
            </Typography>
          </Box>
        </AccordionSummary>
        
        <AccordionDetails sx={{ p: 3 }}>
          <Stack spacing={3}>
            {/* ファイル情報 */}
            {(displayFileContent || sourceFile) && (
              <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FileIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    アップロードファイル情報
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      ファイル名:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {displayFileContent?.filename || sourceFile || 'ファイル名不明'}
                    </Typography>
                  </Grid>
                  
                  {displayFileContent?.content?.wordCount && (
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        文字数:
                      </Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {displayFileContent.content.wordCount.toLocaleString()}文字
                      </Typography>
                    </Grid>
                  )}
                  
                  {displayFileContent?.content?.keywords && displayFileContent.content.keywords.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        検出されたキーワード:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {displayFileContent.content.keywords.slice(0, 10).map((keyword, index) => (
                          <Chip
                            key={index}
                            label={keyword}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                        {displayFileContent.content.keywords.length > 10 && (
                          <Chip
                            label={`+${displayFileContent.content.keywords.length - 10}個`}
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        )}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              </Paper>
            )}

            {/* 直接入力情報 */}
            {displayOriginalInput && (
              <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TextIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    ユーザー入力内容
                  </Typography>
                </Box>
                
                <Paper 
                  sx={{ 
                    p: 2, 
                    backgroundColor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.200',
                    maxHeight: 200,
                    overflow: 'auto'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'inherit'
                    }}
                  >
                    {displayOriginalInput}
                  </Typography>
                </Paper>
                
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  文字数: {displayOriginalInput.length.toLocaleString()}文字
                </Typography>
              </Paper>
            )}

            {/* AI提案情報 */}
            {draft?.aiSuggestionId && (
              <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AIIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    AI提案情報
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  AI提案ID: {draft.aiSuggestionId}
                </Typography>
                {draft.usedPrompt && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    使用プロンプト: あり
                  </Typography>
                )}
              </Paper>
            )}

            <Divider />

            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="body2">
                この情報は記事作成時の元データです。記事編集後も保持され、記事の作成経緯を確認できます。
              </Typography>
            </Alert>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

export default SourceDataDisplay;