// ファイル内容抽出サービス
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { processContent, type ProcessedContent } from '../utils/textProcessor';

// PDF.jsワーカーを設定
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface FileProcessingResult {
  content: ProcessedContent;
  originalText: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  processingTime: number;
  error?: string;
}

// サポートされているファイル形式
export const SUPPORTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
  'text/html': ['.html', '.htm'],
} as const;

export const getSupportedExtensions = (): string[] => {
  return Object.values(SUPPORTED_FILE_TYPES).flat();
};

export const isFileSupported = (file: File): boolean => {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return getSupportedExtensions().includes(extension);
};

// テキストファイルの処理
const processTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file, 'UTF-8');
  });
};

// Word文書の処理
const processDocxFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('Word文書処理の警告:', result.messages);
    }
    
    return result.value;
  } catch (error) {
    console.error('Word文書処理エラー:', error);
    throw new Error('Word文書の処理に失敗しました');
  }
};

// PDF文書の処理
const processPdfFile = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // 各ページからテキストを抽出
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error('PDF処理エラー:', error);
    throw new Error('PDF文書の処理に失敗しました');
  }
};

// HTML文書の処理
const processHtmlFile = async (file: File): Promise<string> => {
  try {
    const htmlContent = await processTextFile(file);
    // HTMLタグを除去してテキストのみを抽出
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  } catch (error) {
    console.error('HTML処理エラー:', error);
    throw new Error('HTML文書の処理に失敗しました');
  }
};

// メインのファイル処理関数
export const processFile = async (file: File): Promise<FileProcessingResult> => {
  const startTime = performance.now();
  
  try {
    // ファイルサイズチェック（10MB制限）
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('ファイルサイズが10MBを超えています');
    }
    
    // ファイル形式チェック
    if (!isFileSupported(file)) {
      throw new Error(`サポートされていないファイル形式です: ${file.name}`);
    }
    
    let rawText = '';
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    // ファイル形式に応じて処理を分岐
    switch (extension) {
      case '.txt':
      case '.md':
        rawText = await processTextFile(file);
        break;
        
      case '.docx':
        rawText = await processDocxFile(file);
        break;
        
      case '.pdf':
        rawText = await processPdfFile(file);
        break;
        
      case '.html':
      case '.htm':
        rawText = await processHtmlFile(file);
        break;
        
      default:
        throw new Error(`サポートされていないファイル形式: ${extension}`);
    }
    
    // テキストが空の場合
    if (!rawText.trim()) {
      throw new Error('ファイルからテキストを抽出できませんでした');
    }
    
    // テキストを処理
    const content = processContent(rawText);
    const processingTime = performance.now() - startTime;
    
    return {
      content,
      originalText: rawText,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      processingTime: Math.round(processingTime),
    };
    
  } catch (error) {
    const processingTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'ファイル処理中に予期しないエラーが発生しました';
    
    return {
      content: {
        text: '',
        wordCount: 0,
        headings: [],
        keywords: [],
        structure: '',
      },
      originalText: '',
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      processingTime: Math.round(processingTime),
      error: errorMessage,
    };
  }
};

// 複数ファイルの処理
export const processMultipleFiles = async (files: File[]): Promise<FileProcessingResult[]> => {
  const results: FileProcessingResult[] = [];
  
  for (const file of files) {
    const result = await processFile(file);
    results.push(result);
  }
  
  return results;
};

// ファイル処理の進行状況を管理するためのユーティリティ
export class FileProcessingManager {
  private processingFiles = new Map<string, boolean>();
  private results = new Map<string, FileProcessingResult>();
  
  isProcessing(filename: string): boolean {
    return this.processingFiles.get(filename) || false;
  }
  
  setProcessing(filename: string, processing: boolean): void {
    this.processingFiles.set(filename, processing);
  }
  
  getResult(filename: string): FileProcessingResult | undefined {
    return this.results.get(filename);
  }
  
  setResult(filename: string, result: FileProcessingResult): void {
    this.results.set(filename, result);
    this.setProcessing(filename, false);
  }
  
  clear(): void {
    this.processingFiles.clear();
    this.results.clear();
  }
}

// 処理可能なファイルかどうかの詳細チェック
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // ファイルサイズチェック
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ファイルサイズが10MBを超えています' };
  }
  
  // 空ファイルチェック
  if (file.size === 0) {
    return { valid: false, error: 'ファイルが空です' };
  }
  
  // 拡張子チェック
  if (!isFileSupported(file)) {
    const supportedExts = getSupportedExtensions().join(', ');
    return { 
      valid: false, 
      error: `サポートされていないファイル形式です。サポート形式: ${supportedExts}` 
    };
  }
  
  return { valid: true };
};

export default {
  processFile,
  processMultipleFiles,
  FileProcessingManager,
  validateFile,
  isFileSupported,
  getSupportedExtensions,
  SUPPORTED_FILE_TYPES,
};