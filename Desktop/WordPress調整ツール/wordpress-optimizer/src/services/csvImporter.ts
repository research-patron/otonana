import type { 
  CSVImportConfig, 
  CSVImportResult, 
  ImportedQualityReport,
  QualityCheckResult,
  QualityCheckReport
} from '../types';

export class CSVImporterService {
  private static instance: CSVImporterService;
  
  static getInstance(): CSVImporterService {
    if (!CSVImporterService.instance) {
      CSVImporterService.instance = new CSVImporterService();
    }
    return CSVImporterService.instance;
  }

  async importCSV(file: File, config: CSVImportConfig): Promise<CSVImportResult> {
    try {
      const csvContent = await this.readFile(file, config.fileEncoding);
      const parsedData = this.parseCSV(csvContent, config);
      const qualityReport = this.convertToQualityReport(parsedData, file.name);
      
      const importedReport: ImportedQualityReport = {
        ...qualityReport,
        importedAt: new Date().toISOString(),
        importedFrom: file.name,
        importVersion: '1.0.0',
        originalGeneratedAt: qualityReport.generatedAt,
        hasRewriteSuggestions: false,
        validationResults: this.validateImportedData(qualityReport)
      };

      return {
        isSuccess: true,
        importedReport,
        errors: [],
        warnings: importedReport.validationResults.warnings,
        stats: {
          totalRows: parsedData.length,
          successfulRows: parsedData.length - importedReport.validationResults.errors.length,
          skippedRows: 0,
          errorRows: importedReport.validationResults.errors.length
        },
        dataQuality: {
          duplicateEntries: this.countDuplicates(parsedData),
          missingRequiredFields: importedReport.validationResults.missingFields,
          invalidDataTypes: []
        }
      };
    } catch (error) {
      console.error('CSV import failed:', error);
      return {
        isSuccess: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        warnings: [],
        stats: {
          totalRows: 0,
          successfulRows: 0,
          skippedRows: 0,
          errorRows: 0
        },
        dataQuality: {
          duplicateEntries: 0,
          missingRequiredFields: [],
          invalidDataTypes: []
        }
      };
    }
  }

  private async readFile(file: File, encoding: CSVImportConfig['fileEncoding']): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading failed'));
      };

      // エンコーディング指定での読み込み
      if (encoding === 'UTF-8' || encoding === 'auto') {
        reader.readAsText(file, 'UTF-8');
      } else if (encoding === 'Shift_JIS') {
        reader.readAsText(file, 'Shift_JIS');
      } else {
        reader.readAsText(file);
      }
    });
  }

  private parseCSV(csvContent: string, config: CSVImportConfig): any[] {
    const lines = csvContent.split('\n').filter(line => 
      config.skipEmptyLines ? line.trim().length > 0 : true
    );

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // BOM除去
    if (lines[0].charCodeAt(0) === 0xFEFF) {
      lines[0] = lines[0].slice(1);
    }

    // 区切り文字の自動検出
    let delimiter = config.delimiter;
    if (delimiter === 'auto') {
      delimiter = this.detectDelimiter(lines[0]);
    }

    // ヘッダーの処理
    let dataLines = lines;
    let headers: string[] = [];
    
    if (config.hasHeader) {
      headers = this.parseLine(lines[0], delimiter);
      dataLines = lines.slice(1);
    } else {
      // ヘッダーがない場合は列番号をヘッダーとして使用
      const firstLine = this.parseLine(lines[0], delimiter);
      headers = firstLine.map((_, index) => `column_${index}`);
    }

    // データの解析
    const parsedData: any[] = [];
    
    dataLines.forEach((line, lineIndex) => {
      if (line.trim().length === 0) return;
      
      try {
        const values = this.parseLine(line, delimiter);
        const rowData: any = {};
        
        headers.forEach((header, index) => {
          rowData[header] = values[index] || '';
        });
        
        parsedData.push(rowData);
      } catch (error) {
        console.warn(`Failed to parse line ${lineIndex + 1}: ${error}`);
      }
    });

    return parsedData;
  }

  private detectDelimiter(line: string): ',' | ';' | '\t' {
    const delimiters = [',', ';', '\t'];
    const counts = delimiters.map(delimiter => 
      (line.match(new RegExp('\\' + delimiter, 'g')) || []).length
    );
    
    const maxIndex = counts.indexOf(Math.max(...counts));
    return delimiters[maxIndex] as ',' | ';' | '\t';
  }

  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされた引用符
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          // 引用符の開始または終了
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // 区切り文字（引用符内でない場合）
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private convertToQualityReport(parsedData: any[], fileName: string): QualityCheckReport {
    const results: QualityCheckResult[] = [];
    
    parsedData.forEach((row, index) => {
      try {
        // CSVの列から QualityCheckResult を構築
        const result: QualityCheckResult = {
          postId: this.parseNumber(row['記事ID'] || row['postId'] || row['id']),
          title: row['タイトル'] || row['title'] || '',
          url: row['URL'] || row['url'] || '',
          status: this.parseStatus(row['ステータス'] || row['status'] || 'publish'),
          lastModified: row['最終更新日'] || row['lastModified'] || new Date().toISOString(),
          categories: this.parseCategories(row['カテゴリー'] || row['categories'] || ''),
          
          // スコア情報
          overallScore: this.parseNumber(row['総合スコア'] || row['overallScore'] || 0),
          ageScore: this.parseNumber(row['古さスコア'] || row['ageScore'] || 0),
          aiTextScore: this.parseNumber(row['AI文章スコア'] || row['aiTextScore'] || 0),
          misinformationScore: this.parseNumber(row['誤情報リスクスコア'] || row['misinformationScore'] || 0),
          
          // 分析結果（最小限）
          textlintResult: {
            messages: this.parseTextLintMessages(row['TextLintメッセージ'] || row['textlintMessages'] || '')
          },
          geminiAnalysis: this.parseGeminiAnalysis(row),
          
          // 推奨アクション
          priority: this.parsePriority(row['優先度'] || row['priority'] || 'medium'),
          rewriteReasons: this.parseStringArray(row['リライト推奨理由'] || row['rewriteReasons'] || ''),
          recommendedActions: this.parseStringArray(row['推奨アクション'] || row['recommendedActions'] || ''),
          
          // 処理情報
          checkedAt: row['チェック実行日時'] || row['checkedAt'] || new Date().toISOString(),
          processingTime: this.parseNumber(row['処理時間(ms)'] || row['processingTime'] || 0)
        };
        
        results.push(result);
      } catch (error) {
        console.warn(`Failed to convert row ${index + 1}:`, error);
      }
    });

    // レポートの構築
    const now = new Date().toISOString();
    const summary = this.calculateSummary(results);
    
    return {
      siteId: 'imported',
      siteName: fileName,
      generatedAt: now,
      config: {
        siteId: 'imported',
        filters: {
          statusFilter: ['publish', 'draft']
        },
        scoring: {
          scoreThreshold: 60,
          ageWeight: 0.3,
          aiTextWeight: 0.3,
          misinformationWeight: 0.4
        },
        textlintRules: {
          aiWritingDetection: true,
          excessiveBulletPoints: true,
          aiPhrasePatterns: true
        },
        geminiAnalysis: {
          checkMisinformation: true,
          checkRecency: true,
          checkLogicalConsistency: false,
          checkSEO: true,
          checkReadability: true
        }
      },
      summary,
      results,
      statistics: this.calculateStatistics(results),
      exportFormat: 'csv',
      fileName: fileName.replace('.csv', '_imported.csv')
    };
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  private parseStatus(value: string): QualityCheckResult['status'] {
    const statusMap: Record<string, QualityCheckResult['status']> = {
      'publish': 'publish',
      '公開': 'publish',
      'draft': 'draft',
      '下書き': 'draft',
      'private': 'private',
      'プライベート': 'private',
      'pending': 'pending',
      '承認待ち': 'pending',
      'future': 'future',
      '予約投稿': 'future'
    };
    
    return statusMap[value.toLowerCase()] || 'publish';
  }

  private parseCategories(value: string): Array<{ id: number; name: string }> {
    if (!value) return [];
    
    return value.split(',').map((cat, index) => ({
      id: index + 1,
      name: cat.trim()
    }));
  }

  private parsePriority(value: string): 'high' | 'medium' | 'low' {
    const priorityMap: Record<string, 'high' | 'medium' | 'low'> = {
      'high': 'high',
      '高': 'high',
      'medium': 'medium',
      '中': 'medium',
      'low': 'low',
      '低': 'low'
    };
    
    return priorityMap[value.toLowerCase()] || 'medium';
  }

  private parseStringArray(value: string): string[] {
    if (!value) return [];
    return value.split(';').map(item => item.trim()).filter(item => item.length > 0);
  }

  private parseTextLintMessages(value: string): any[] {
    if (!value) return [];
    
    return value.split(';').map((message, index) => ({
      ruleId: `imported-rule-${index}`,
      severity: 2,
      message: message.trim(),
      line: 1,
      column: 1,
      type: 'lint' as const
    }));
  }

  private parseGeminiAnalysis(row: any): any {
    return {
      misinformationRisk: {
        score: this.parseNumber(row['誤情報リスクスコア'] || 0),
        issues: this.parseStringArray(row['誤情報検出問題'] || ''),
        recommendations: []
      },
      recencyCheck: {
        score: 100 - this.parseNumber(row['古さスコア'] || 0),
        outdatedInfo: this.parseStringArray(row['古い情報'] || ''),
        updateSuggestions: []
      },
      logicalConsistency: {
        score: 80,
        inconsistencies: this.parseStringArray(row['論理的矛盾'] || ''),
        improvements: []
      },
      seoAnalysis: {
        metaDescriptionScore: 70,
        headingStructureScore: 70,
        brokenLinks: [],
        recommendations: this.parseStringArray(row['SEO推奨事項'] || '')
      },
      readabilityScore: {
        score: 75,
        sentenceLengthIssues: 0,
        complexTermsCount: 0,
        missingAltTexts: 0,
        suggestions: this.parseStringArray(row['読みやすさ改善案'] || '')
      }
    };
  }

  private calculateSummary(results: QualityCheckResult[]) {
    const totalPosts = results.length;
    const highPriorityIssues = results.filter(r => r.priority === 'high').length;
    const mediumPriorityIssues = results.filter(r => r.priority === 'medium').length;
    const lowPriorityIssues = results.filter(r => r.priority === 'low').length;
    
    const averageScore = totalPosts > 0 
      ? results.reduce((sum, r) => sum + r.overallScore, 0) / totalPosts 
      : 0;
    
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    
    return {
      totalPosts,
      postsChecked: totalPosts,
      highPriorityIssues,
      mediumPriorityIssues,
      lowPriorityIssues,
      averageScore,
      processingTime: totalProcessingTime
    };
  }

  private calculateStatistics(results: QualityCheckResult[]) {
    // スコア分布の計算
    const scoreDistribution = [
      { range: '0-20', count: 0 },
      { range: '21-40', count: 0 },
      { range: '41-60', count: 0 },
      { range: '61-80', count: 0 },
      { range: '81-100', count: 0 }
    ];
    
    results.forEach(result => {
      const score = result.overallScore;
      if (score <= 20) scoreDistribution[0].count++;
      else if (score <= 40) scoreDistribution[1].count++;
      else if (score <= 60) scoreDistribution[2].count++;
      else if (score <= 80) scoreDistribution[3].count++;
      else scoreDistribution[4].count++;
    });
    
    // 共通問題の抽出
    const issueFrequency: Record<string, number> = {};
    results.forEach(result => {
      result.rewriteReasons.forEach(reason => {
        issueFrequency[reason] = (issueFrequency[reason] || 0) + 1;
      });
    });
    
    const commonIssues = Object.entries(issueFrequency)
      .map(([issue, frequency]) => ({ issue, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    // カテゴリー別の分析
    const categoryStats: Record<string, { postsCount: number; totalScore: number }> = {};
    results.forEach(result => {
      result.categories.forEach(category => {
        if (!categoryStats[category.name]) {
          categoryStats[category.name] = { postsCount: 0, totalScore: 0 };
        }
        categoryStats[category.name].postsCount++;
        categoryStats[category.name].totalScore += result.overallScore;
      });
    });
    
    const categoryBreakdown = Object.entries(categoryStats).map(([categoryName, stats]) => ({
      categoryName,
      postsCount: stats.postsCount,
      averageScore: stats.postsCount > 0 ? stats.totalScore / stats.postsCount : 0
    }));
    
    return {
      scoreDistribution,
      commonIssues,
      categoryBreakdown
    };
  }

  private validateImportedData(report: QualityCheckReport) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const missingFields: string[] = [];
    
    // 必須フィールドのチェック
    if (report.results.length === 0) {
      errors.push('No data rows found in the imported file');
    }
    
    report.results.forEach((result, index) => {
      if (!result.postId || result.postId <= 0) {
        errors.push(`Row ${index + 1}: Invalid post ID`);
      }
      
      if (!result.title || result.title.trim().length === 0) {
        warnings.push(`Row ${index + 1}: Empty title`);
      }
      
      if (!result.url || !result.url.startsWith('http')) {
        warnings.push(`Row ${index + 1}: Invalid URL format`);
      }
      
      if (result.overallScore < 0 || result.overallScore > 100) {
        warnings.push(`Row ${index + 1}: Overall score out of range (0-100)`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      missingFields
    };
  }

  private countDuplicates(data: any[]): number {
    const seen = new Set();
    let duplicates = 0;
    
    data.forEach(row => {
      const key = `${row.postId || ''}-${row.title || ''}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    });
    
    return duplicates;
  }
}

export const csvImporterService = CSVImporterService.getInstance();