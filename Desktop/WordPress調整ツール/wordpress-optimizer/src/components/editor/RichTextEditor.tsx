import { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { 
  Box, 
  Paper, 
  Typography, 
  Chip,
  LinearProgress,
} from '@mui/material';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: number;
  placeholder?: string;
  disabled?: boolean;
  onWordCountChange?: (count: number) => void;
}

function RichTextEditor({
  value,
  onChange,
  height = 500,
  placeholder = '記事の内容を入力してください...',
  disabled = false,
  onWordCountChange,
}: RichTextEditorProps) {
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 文字数カウント
  const updateWordCount = (content: string) => {
    // Markdownタグを除去してプレーンテキストの文字数をカウント
    const plainText = content
      .replace(/[#*`_~\[\]()]/g, '') // Markdown記号を除去
      .replace(/!\[.*?\]\(.*?\)/g, '') // 画像リンクを除去
      .replace(/\[.*?\]\(.*?\)/g, '') // リンクを除去
      .replace(/```[\s\S]*?```/g, '') // コードブロックを除去
      .replace(/`.*?`/g, '') // インラインコードを除去
      .replace(/\n+/g, ' ') // 改行を空白に置換
      .trim();
    const count = plainText.length;
    setWordCount(count);
    onWordCountChange?.(count);
  };

  const handleEditorChange = (content: string) => {
    onChange(content);
    updateWordCount(content);
  };

  useEffect(() => {
    if (value && value.trim()) {
      console.log('Setting initial markdown content:', value.length, 'characters');
      updateWordCount(value);
    }
    setIsLoading(false);
  }, [value]);


  return (
    <Paper elevation={2} sx={{ overflow: 'hidden' }}>
      {/* エディタヘッダー */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h6">
          記事エディタ (Markdown)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${wordCount.toLocaleString()}文字`}
            size="small"
            color={wordCount > 2000 ? 'primary' : wordCount > 1000 ? 'secondary' : 'default'}
          />
          {wordCount > 0 && (
            <Chip
              label={`約${Math.ceil(wordCount / 400)}分`}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* ローディングバー */}
      {isLoading && (
        <Box sx={{ px: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {/* エディタ本体 */}
      <Box sx={{ 
        minHeight: height, 
        position: 'relative',
        '& .w-md-editor': {
          backgroundColor: 'transparent',
        },
        '& .w-md-editor-text-pre, & .w-md-editor-text-input, & .w-md-editor-text': {
          color: '#24292e !important',
          fontSize: '14px !important',
          lineHeight: '1.6 !important',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important',
        },
        '& .w-md-editor-preview': {
          backgroundColor: '#fff',
          padding: '16px',
          fontSize: '14px',
          lineHeight: 1.6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        '& .w-md-editor-toolbar': {
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e1e4e8',
        },
        '& .w-md-editor-toolbar-divider': {
          backgroundColor: '#e1e4e8',
        },
        '& .w-md-editor-text-area': {
          border: 'none',
          outline: 'none',
        },
      }}>
        <MDEditor
          value={value || ''}
          onChange={(val) => {
            const content = val || '';
            console.log('Markdown content changed, length:', content.length);
            onChange(content);
            updateWordCount(content);
          }}
          height={height}
          data-color-mode="light"
          visibleDragBar={false}
          textareaProps={{
            placeholder,
            disabled,
            style: {
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
          }}
          preview="edit"
          hideToolbar={disabled}
        />
      </Box>

      {/* エディタフッター */}
      <Box sx={{ 
        p: 1, 
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'grey.50',
        fontSize: '0.75rem',
        color: 'text.secondary'
      }}>
        <Typography variant="caption">
          Tip: Ctrl+S で下書き保存、Ctrl+Enter でプレビュー表示
        </Typography>
      </Box>
    </Paper>
  );
}

export default RichTextEditor;