import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Edit as EditIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatListBulleted as ListIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Code as CodeIcon,
} from '@mui/icons-material';

interface MarkdownEditorProps {
  value: string;
  onChange: (content: string) => void;
  height?: number;
  placeholder?: string;
  disabled?: boolean;
  onWordCountChange?: (count: number) => void;
}

function MarkdownEditor({
  value,
  onChange,
  height = 500,
  placeholder = 'Markdownで記事を作成...',
  disabled = false,
  onWordCountChange,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState(0);
  const [wordCount, setWordCount] = useState(0);

  // 簡易Markdownパーサー（実際のプロジェクトでは専用ライブラリを使用推奨）
  const parseMarkdown = (markdown: string): string => {
    let html = markdown;
    
    // ヘッダー
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // ボールド・イタリック
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // リンク
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // 画像
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-width: 100%; height: auto;" />');
    
    // コード（インライン）
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // コードブロック
    html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
    
    // リスト
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // 空の段落を削除
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');
    
    // 改行をBRタグに変換
    html = html.replace(/\n/g, '<br />');
    
    return html;
  };

  // 文字数カウント
  const updateWordCount = (content: string) => {
    const plainText = content.replace(/[#*`\[\]()!-]/g, '').trim();
    const count = plainText.length;
    setWordCount(count);
    onWordCountChange?.(count);
  };

  const handleChange = (content: string) => {
    onChange(content);
    updateWordCount(content);
  };

  useEffect(() => {
    updateWordCount(value);
  }, [value]);

  // Markdownショートカット挿入
  const insertMarkdown = (syntax: string, placeholder: string = '') => {
    const textarea = document.getElementById('markdown-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const replacement = syntax.replace('PLACEHOLDER', selectedText || placeholder);
    
    const newContent = value.substring(0, start) + replacement + value.substring(end);
    handleChange(newContent);
    
    // カーソル位置を調整
    setTimeout(() => {
      const newCursorPos = start + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const shortcuts = [
    { icon: <BoldIcon />, tooltip: '太字 (Ctrl+B)', syntax: '**PLACEHOLDER**', placeholder: '太字テキスト' },
    { icon: <ItalicIcon />, tooltip: '斜体 (Ctrl+I)', syntax: '*PLACEHOLDER*', placeholder: '斜体テキスト' },
    { icon: <ListIcon />, tooltip: 'リスト', syntax: '* PLACEHOLDER', placeholder: 'リスト項目' },
    { icon: <LinkIcon />, tooltip: 'リンク', syntax: '[PLACEHOLDER](URL)', placeholder: 'リンクテキスト' },
    { icon: <ImageIcon />, tooltip: '画像', syntax: '![PLACEHOLDER](画像URL)', placeholder: '画像の説明' },
    { icon: <CodeIcon />, tooltip: 'コード', syntax: '`PLACEHOLDER`', placeholder: 'コード' },
  ];

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
          Markdownエディタ
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

      {/* ツールバー */}
      <Box sx={{ 
        p: 1, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 0.5
      }}>
        {shortcuts.map((shortcut, index) => (
          <Tooltip key={index} title={shortcut.tooltip}>
            <IconButton
              size="small"
              onClick={() => insertMarkdown(shortcut.syntax, shortcut.placeholder)}
              disabled={disabled}
            >
              {shortcut.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* タブ */}
      <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)}>
        <Tab icon={<EditIcon />} label="編集" />
        <Tab icon={<PreviewIcon />} label="プレビュー" />
      </Tabs>

      {/* エディタ・プレビューエリア */}
      <Box sx={{ height: height, overflow: 'hidden' }}>
        {tab === 0 ? (
          // 編集モード
          <TextField
            id="markdown-textarea"
            multiline
            fullWidth
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            sx={{
              '& .MuiInputBase-root': {
                height: '100%',
                alignItems: 'flex-start',
              },
              '& .MuiInputBase-input': {
                height: `${height - 50}px !important`,
                overflow: 'auto !important',
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
                fontSize: '14px',
                lineHeight: 1.6,
                resize: 'none',
              },
            }}
            InputProps={{
              sx: { 
                borderRadius: 0,
                '& fieldset': { border: 'none' },
              }
            }}
          />
        ) : (
          // プレビューモード
          <Box
            sx={{
              height: height - 50,
              overflow: 'auto',
              p: 3,
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                fontWeight: 600,
                lineHeight: 1.3,
                margin: '1.5em 0 0.5em 0',
              },
              '& h1': { fontSize: '2em' },
              '& h2': { fontSize: '1.5em' },
              '& h3': { fontSize: '1.25em' },
              '& p': { margin: '0 0 1em 0', lineHeight: 1.6 },
              '& ul, & ol': { paddingLeft: '1.5em' },
              '& li': { margin: '0.5em 0' },
              '& code': {
                backgroundColor: '#f4f4f4',
                padding: '0.2em 0.4em',
                borderRadius: '3px',
                fontFamily: '"Monaco", "Menlo", "Ubuntu Mono", monospace',
              },
              '& pre': {
                backgroundColor: '#f4f4f4',
                padding: '1em',
                borderRadius: '3px',
                overflow: 'auto',
                '& code': {
                  backgroundColor: 'transparent',
                  padding: 0,
                },
              },
              '& a': {
                color: 'primary.main',
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                display: 'block',
                margin: '1em 0',
              },
            }}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(value) }}
          />
        )}
      </Box>

      {/* フッター */}
      <Box sx={{ 
        p: 1, 
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'grey.50',
        fontSize: '0.75rem',
        color: 'text.secondary'
      }}>
        <Typography variant="caption">
          Markdownシンタックス: **太字** *斜体* `コード` [リンク](URL) ![画像](URL) # 見出し
        </Typography>
      </Box>
    </Paper>
  );
}

export default MarkdownEditor;