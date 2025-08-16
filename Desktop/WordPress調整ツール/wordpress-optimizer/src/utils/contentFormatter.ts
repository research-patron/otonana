import type { AISuggestion } from '../types';

/**
 * AI提案の内容を構造化されたHTMLに変換するユーティリティ
 */

/**
 * テキストを段落に分割してHTMLのpタグで囲む
 */
export const formatTextToParagraphs = (text: string): string => {
  if (!text) return '';
  
  // 改行を基準に段落を分割
  const paragraphs = text
    .split(/\n\s*\n/) // 空行で分割
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  // 各段落をpタグで囲む
  return paragraphs
    .map(paragraph => {
      // 単一の改行は<br>に変換
      const formattedParagraph = paragraph.replace(/\n/g, '<br>');
      return `<p>${formattedParagraph}</p>`;
    })
    .join('\n\n');
};

/**
 * 記事構成の見出しをHTMLに変換
 */
export const formatHeadingsToHTML = (headings: AISuggestion['structure']['headings']): string => {
  if (!headings || headings.length === 0) return '';
  
  return headings
    .map(heading => {
      const tag = `h${heading.level}`;
      return `<${tag}>${heading.text}</${tag}>\n<p>${heading.description}</p>`;
    })
    .join('\n\n');
};

/**
 * AI提案のfullArticleを構造化されたHTMLに変換
 */
export const formatFullArticleToHTML = (
  suggestion: AISuggestion
): string => {
  if (!suggestion.fullArticle) {
    return '';
  }

  const { introduction, mainContent, conclusion } = suggestion.fullArticle;
  const { headings } = suggestion.structure;
  
  let htmlContent = '';
  
  // 導入部分
  if (introduction) {
    htmlContent += `<div class="introduction">\n${formatTextToParagraphs(introduction)}\n</div>\n\n`;
  }
  
  // メインコンテンツ
  if (mainContent) {
    // 見出し構造がある場合は、それを使ってコンテンツを構造化
    if (headings && headings.length > 0) {
      htmlContent += `<div class="main-content">\n`;
      
      // メインコンテンツを見出しごとに分割して構造化
      const contentSections = splitContentByHeadings(mainContent, headings);
      
      headings.forEach((heading, index) => {
        htmlContent += `<h${heading.level}>${heading.text}</h${heading.level}>\n`;
        
        // 対応するコンテンツセクションがあれば追加
        if (contentSections[index]) {
          htmlContent += `${formatTextToParagraphs(contentSections[index])}\n\n`;
        } else {
          // コンテンツセクションがない場合は見出しの説明を使用
          htmlContent += `${formatTextToParagraphs(heading.description)}\n\n`;
        }
      });
      
      htmlContent += `</div>\n\n`;
    } else {
      // 見出し構造がない場合は、メインコンテンツをそのまま段落化
      htmlContent += `<div class="main-content">\n${formatTextToParagraphs(mainContent)}\n</div>\n\n`;
    }
  }
  
  // 結論部分
  if (conclusion) {
    htmlContent += `<div class="conclusion">\n${formatTextToParagraphs(conclusion)}\n</div>`;
  }
  
  return htmlContent.trim();
};

/**
 * メインコンテンツを見出し構造に基づいて分割
 */
const splitContentByHeadings = (
  mainContent: string, 
  headings: AISuggestion['structure']['headings']
): string[] => {
  // 簡易的な分割ロジック
  // メインコンテンツを段落で分割し、見出し数に基づいて配分
  const paragraphs = mainContent
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  if (paragraphs.length === 0) return [];
  
  const sectionsCount = headings.length;
  const paragraphsPerSection = Math.ceil(paragraphs.length / sectionsCount);
  
  const sections: string[] = [];
  for (let i = 0; i < sectionsCount; i++) {
    const startIndex = i * paragraphsPerSection;
    const endIndex = Math.min(startIndex + paragraphsPerSection, paragraphs.length);
    const sectionParagraphs = paragraphs.slice(startIndex, endIndex);
    sections.push(sectionParagraphs.join('\n\n'));
  }
  
  return sections;
};

/**
 * プレーンテキストからHTMLへの基本的な変換
 */
export const convertTextToHTML = (text: string): string => {
  if (!text) return '';
  
  // 基本的なマークダウン風記法をHTMLに変換
  let html = text;
  
  // 見出しの変換（## → h2, ### → h3）
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // 太字の変換
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // 斜体の変換
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // 段落の変換
  html = formatTextToParagraphs(html);
  
  return html;
};

/**
 * HTMLコンテンツのクリーンアップ
 */
export const cleanupHTML = (html: string): string => {
  if (!html) return '';
  
  // 余分な空白行を削除
  let cleaned = html.replace(/\n{3,}/g, '\n\n');
  
  // 空のpタグを削除
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');
  
  // 連続するpタグの間の改行を正規化
  cleaned = cleaned.replace(/(<\/p>)\s*(<p>)/g, '$1\n\n$2');
  
  return cleaned.trim();
};

export default {
  formatTextToParagraphs,
  formatHeadingsToHTML,
  formatFullArticleToHTML,
  convertTextToHTML,
  cleanupHTML,
};