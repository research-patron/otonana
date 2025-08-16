// テキスト前処理ユーティリティ

export interface ProcessedContent {
  text: string;
  wordCount: number;
  headings: Array<{
    level: number;
    text: string;
    position: number;
  }>;
  keywords: string[];
  structure: string;
}

// 基本的なテキスト正規化
export const normalizeText = (text: string): string => {
  return text
    // 改行の統一
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 複数の空行を単一に
    .replace(/\n{3,}/g, '\n\n')
    // 行末の空白除去
    .replace(/[ \t]+$/gm, '')
    // 全角空白の処理
    .replace(/　/g, ' ')
    // 複数の空白を単一に
    .replace(/[ \t]{2,}/g, ' ')
    // 前後の空白除去
    .trim();
};

// 見出し構造の抽出
export const extractHeadings = (text: string): Array<{ level: number; text: string; position: number }> => {
  const headings: Array<{ level: number; text: string; position: number }> = [];
  const lines = text.split('\n');
  
  lines.forEach((line, index) => {
    // Markdown形式の見出し (#, ##, ###)
    const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (markdownMatch) {
      headings.push({
        level: markdownMatch[1].length,
        text: markdownMatch[2].trim(),
        position: index,
      });
      return;
    }
    
    // 数字付き見出し (1. 2. など)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      headings.push({
        level: 2,
        text: numberedMatch[2].trim(),
        position: index,
      });
      return;
    }
    
    // 箇条書き見出し (・ - * など)
    const bulletMatch = line.match(/^[・\-\*]\s+(.+)$/);
    if (bulletMatch && bulletMatch[1].length > 10) { // 長いテキストのみ見出しとして判定
      headings.push({
        level: 3,
        text: bulletMatch[1].trim(),
        position: index,
      });
    }
  });
  
  return headings;
};

// キーワード抽出
export const extractKeywords = (text: string, limit: number = 20): string[] => {
  // HTMLタグを除去
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  // 単語を抽出（日本語と英語に対応）
  const words = cleanText.match(/[\p{L}\p{N}]+/gu) || [];
  
  // 単語の出現回数をカウント
  const wordCounts = words.reduce((acc, word) => {
    const normalizedWord = word.toLowerCase();
    // 短すぎる単語や数字のみは除外
    if (normalizedWord.length < 2 || /^\d+$/.test(normalizedWord)) {
      return acc;
    }
    acc[normalizedWord] = (acc[normalizedWord] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // 出現回数順にソートして上位を取得
  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([word]) => word);
};

// 文字数カウント
export const countWords = (text: string): number => {
  // HTMLタグを除去
  const cleanText = text.replace(/<[^>]*>/g, '');
  // 日本語文字と英単語を考慮した文字数カウント
  const japaneseChars = cleanText.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/gu) || [];
  const words = cleanText.match(/[a-zA-Z]+/g) || [];
  return japaneseChars.length + words.length;
};

// 文書構造の分析
export const analyzeStructure = (text: string): string => {
  const headings = extractHeadings(text);
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const wordCount = countWords(text);
  
  if (headings.length === 0) {
    return '構造化されていないテキスト';
  }
  
  const levelCounts = headings.reduce((acc, h) => {
    acc[h.level] = (acc[h.level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  const structure = Object.entries(levelCounts)
    .map(([level, count]) => `H${level}: ${count}個`)
    .join(', ');
  
  return `見出し構造あり (${structure}), 総文字数: ${wordCount}文字, 段落数: ${Math.ceil(lines.length / 5)}`;
};

// メインの処理関数
export const processContent = (rawText: string): ProcessedContent => {
  const normalizedText = normalizeText(rawText);
  const headings = extractHeadings(normalizedText);
  const keywords = extractKeywords(normalizedText);
  const wordCount = countWords(normalizedText);
  const structure = analyzeStructure(normalizedText);
  
  return {
    text: normalizedText,
    wordCount,
    headings,
    keywords,
    structure,
  };
};

// ファイル拡張子から MIME タイプを取得
export const getMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    html: 'text/html',
    htm: 'text/html',
  };
  return mimeTypes[extension || ''] || 'application/octet-stream';
};

// ファイルサイズの読みやすい表示
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default {
  normalizeText,
  extractHeadings,
  extractKeywords,
  countWords,
  analyzeStructure,
  processContent,
  getMimeType,
  formatFileSize,
};