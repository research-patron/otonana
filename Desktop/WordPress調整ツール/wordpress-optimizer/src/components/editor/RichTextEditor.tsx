import { useRef, useEffect, useState } from 'react';
import { Editor } from '@tinymce/tinymce-react';
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
  const editorRef = useRef<any>(null);
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 文字数カウント
  const updateWordCount = (content: string) => {
    // HTMLタグを除去してプレーンテキストの文字数をカウント
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    const count = plainText.length;
    setWordCount(count);
    onWordCountChange?.(count);
  };

  const handleEditorChange = (content: string) => {
    onChange(content);
    updateWordCount(content);
  };

  useEffect(() => {
    updateWordCount(value);
  }, [value]);

  // TinyMCE設定
  const editorConfig: any = {
    height,
    menubar: false,
    // GPLライセンス用の設定
    license_key: 'gpl',
    promotion: false,
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'table', 'preview', 'help', 'wordcount',
      'emoticons', 'codesample'
    ],
    toolbar: [
      'undo redo | blocks | bold italic underline strikethrough | fontfamily fontsize',
      'forecolor backcolor | alignleft aligncenter alignright alignjustify',
      'bullist numlist outdent indent | removeformat | help',
      'link unlink image table | code preview fullscreen'
    ].join(' | '),
    content_style: `
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        margin: 1rem;
      }
      h1, h2, h3, h4, h5, h6 {
        font-weight: 600;
        line-height: 1.3;
        margin: 1.5em 0 0.5em 0;
      }
      h1 { font-size: 2em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.25em; }
      p { margin: 0 0 1em 0; }
      blockquote {
        border-left: 4px solid #ddd;
        margin: 1em 0;
        padding: 0.5em 1em;
        font-style: italic;
      }
      code {
        background: #f4f4f4;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      }
      pre {
        background: #f4f4f4;
        padding: 1em;
        border-radius: 3px;
        overflow-x: auto;
      }
    `,
    placeholder,
    branding: false,
    resize: false,
    elementpath: false,
    statusbar: false,
    block_formats: 'Paragraph=p; Heading 2=h2; Heading 3=h3; Heading 4=h4; Preformatted=pre',
    // カスタムスタイル
    formats: {
      alignleft: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-left' },
      aligncenter: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-center' },
      alignright: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-right' },
      alignjustify: { selector: 'p,h1,h2,h3,h4,h5,h6,td,th,div,ul,ol,li,table,img', classes: 'text-justify' }
    },
    // 画像設定
    images_upload_handler: (blobInfo: any, progress: any) => new Promise((resolve, reject) => {
      // 実際のプロジェクトでは画像アップロード処理を実装
      reject('画像アップロード機能は未実装です');
    }),
    // リンク設定
    link_default_target: '_blank',
    link_assume_external_targets: true,
    // テーブル設定
    table_default_attributes: {
      class: 'table'
    },
    // コードサンプル設定
    codesample_languages: [
      { text: 'HTML/XML', value: 'markup' },
      { text: 'JavaScript', value: 'javascript' },
      { text: 'CSS', value: 'css' },
      { text: 'PHP', value: 'php' },
      { text: 'Python', value: 'python' },
      { text: 'Java', value: 'java' }
    ],
    // その他設定
    entity_encoding: 'raw',
    remove_script_host: false,
    convert_urls: false,
    // イベントハンドラ
    setup: (editor: any) => {
      editor.on('init', () => {
        setIsLoading(false);
      });
      
      editor.on('keyup change', () => {
        const content = editor.getContent();
        handleEditorChange(content);
      });

      // カスタムボタンの追加例
      editor.ui.registry.addButton('seo-heading', {
        text: 'SEO見出し',
        onAction: () => {
          editor.insertContent('<h2>SEO最適化見出し</h2>');
        }
      });
    }
  };

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
          記事エディタ
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
      <Box sx={{ minHeight: height, position: 'relative' }}>
        <Editor
          ref={editorRef}
          value={value}
          init={editorConfig}
          onEditorChange={handleEditorChange}
          disabled={disabled}
          // ローカルのTinyMCEを使用してライセンスエラーを回避
          tinymceScriptSrc="/tinymce/tinymce.min.js"
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