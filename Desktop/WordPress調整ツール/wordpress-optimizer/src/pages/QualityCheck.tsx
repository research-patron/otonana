import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Alert,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Settings as SettingsIcon,
  PlayArrow as PlayIcon,
  Assessment as AssessmentIcon,
  GetApp as GetAppIcon
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { getCategories, testSiteConnection } from '../services/wordpress';
import qualityCheckerService from '../services/qualityChecker';
// 暗号化処理は削除 - シンプルに平文で管理
import CheckConfigForm from '../components/quality/CheckConfigForm';
import ProgressDisplay from '../components/quality/ProgressDisplay';
import ResultsTable from '../components/quality/ResultsTable';
import ReportGenerator from '../components/quality/ReportGenerator';
import type { 
  QualityCheckConfig, 
  QualityCheckProgress, 
  QualityCheckReport,
  WordPressCategory,
  WordPressSite,
  CSVExportOptions
} from '../types';

const steps = [
  {
    label: '設定',
    description: 'チェック対象とスコア計算の設定'
  },
  {
    label: '実行',
    description: '品質チェックの実行'
  },
  {
    label: '結果確認',
    description: '分析結果の確認'
  },
  {
    label: 'エクスポート',
    description: 'レポートのダウンロード'
  }
];

export default function QualityCheck() {
  const { config } = useAppStore();
  const sites = config?.sites || [];
  const [activeStep, setActiveStep] = useState(0);
  const [categories, setCategories] = useState<WordPressCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 品質チェック関連の状態
  const [checkConfig, setCheckConfig] = useState<QualityCheckConfig>({
    siteId: '',
    filters: {
      statusFilter: ['publish'],
      categoryIds: undefined,
      excludedPostIds: undefined,
      dateRange: undefined
    },
    scoring: {
      scoreThreshold: 60,
      ageWeight: 0.3,
      aiTextWeight: 1.0,
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
      checkLogicalConsistency: true,
      checkSEO: true,
      checkReadability: true
    }
  });
  
  const [progress, setProgress] = useState<QualityCheckProgress>({
    total: 0,
    current: 0,
    currentTitle: '',
    percentage: 0,
    status: 'idle',
    errors: []
  });
  
  const [report, setReport] = useState<QualityCheckReport | null>(null);

  // 現在のサイトを取得
  const currentSite: WordPressSite | undefined = sites.find(site => site.id === config?.currentSiteId);

  // デバッグ情報
  console.log('QualityCheck Debug:', {
    configExists: !!config,
    sitesCount: sites.length,
    currentSiteId: config?.currentSiteId,
    currentSite: currentSite ? `${currentSite.name || currentSite.url} (${currentSite.id})` : 'None',
    sites: sites.map(s => ({ id: s.id, name: s.name || s.url }))
  });

  // 初期化
  useEffect(() => {
    if (currentSite) {
      setCheckConfig(prev => ({ ...prev, siteId: currentSite.id }));
      loadCategories();
    }
  }, [currentSite]);

  // カテゴリー取得
  const loadCategories = async () => {
    if (!currentSite) return;

    setLoading(true);
    setError(null);
    
    try {
      // サイト接続テスト
      const connectionTest = await testSiteConnection(currentSite);
      if (!connectionTest.success) {
        throw new Error(`サイト接続エラー: ${connectionTest.message}`);
      }

      // カテゴリー取得
      const fetchedCategories = await getCategories(currentSite);
      setCategories(fetchedCategories);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setError(`カテゴリーの取得に失敗しました: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 品質チェック実行
  const startQualityCheck = async () => {
    if (!currentSite) {
      setError('WordPressサイトが設定されていません。設定画面でサイト情報を入力してください。');
      return;
    }

    try {
      setActiveStep(1);
      setError(null);

      // Gemini分析を使用する場合のみAPIキーを検証
      let apiKey: string = '';
      if (checkConfig.geminiAnalysis && Object.values(checkConfig.geminiAnalysis).some(v => v)) {
        if (!config?.geminiApiKey) {
          throw new Error('Gemini分析が有効ですが、APIキーが設定されていません。設定画面でAPIキーを入力してください。');
        }
        
        // シンプルにAPIキーを直接使用（平文管理）
        apiKey = config.geminiApiKey;
        
        console.log('Debug - QualityCheck: Using API key directly (plain text)');
        console.log('Debug - QualityCheck: API Key present:', !!apiKey);
        console.log('Debug - QualityCheck: API Key length:', apiKey?.length || 0);
        console.log('Debug - QualityCheck: API Key starts with AIza:', apiKey?.startsWith('AIza') || false);
        
        if (!apiKey || apiKey.trim() === '') {
          throw new Error('Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。');
        }
      } else {
        console.log('Debug - QualityCheck: Gemini analysis disabled, skipping API key validation');
      }
      
      // APIキーをqualityCheckerServiceに直接渡す
      const generatedReport = await qualityCheckerService.startQualityCheck(
        currentSite,
        checkConfig,
        apiKey,
        setProgress
      );

      setReport(generatedReport);
      setActiveStep(2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('Quality check failed:', error);
      
      // エラータイプに応じて適切なガイダンスを提供
      let userFriendlyMessage = `品質チェックが中断されました\n最新のエラー: ${errorMessage}`;
      
      // より具体的なエラー分類とソリューション
      if (errorMessage.includes('APIキー') || errorMessage.includes('復号化')) {
        userFriendlyMessage = `🔑 APIキーの問題\n${errorMessage}\n\n💡 解決方法:\n• 設定画面でGemini APIキーを再入力\n• APIキーがAIzaで始まる39文字の形式であることを確認\n• ブラウザキャッシュをクリアして再試行`;
      } else if (errorMessage.includes('サイト') || errorMessage.includes('接続') || errorMessage.includes('WordPress')) {
        userFriendlyMessage = `🌐 WordPress接続エラー\n${errorMessage}\n\n💡 解決方法:\n• WordPressサイトが正常に動作しているか確認\n• サイトURL、ユーザー名、パスワードが正しいか確認\n• アプリケーションパスワードの有効期限を確認`;
      } else if (errorMessage.includes('JSON') || errorMessage.includes('parse') || errorMessage.includes('分析')) {
        userFriendlyMessage = `🤖 AI分析処理エラー\n${errorMessage}\n\n💡 解決方法:\n• しばらく時間をおいて再試行\n• 対象記事数を減らして実行\n• Gemini APIの利用制限を確認`;
      } else if (errorMessage.includes('記事') || errorMessage.includes('データ')) {
        userFriendlyMessage = `📄 記事データエラー\n${errorMessage}\n\n💡 解決方法:\n• フィルタ条件を見直して記事を絞り込み\n• WordPressの記事データに問題がないか確認\n• カテゴリー設定を確認`;
      }
      
      setError(userFriendlyMessage);
      setProgress(prev => ({ ...prev, status: 'error', errors: [...prev.errors, errorMessage] }));
    }
  };

  // 品質チェックキャンセル
  const cancelQualityCheck = () => {
    qualityCheckerService.cancelQualityCheck();
  };

  // カスタムエクスポート処理
  const handleCustomExport = async (options: CSVExportOptions) => {
    if (!report) {
      throw new Error('エクスポートするレポートがありません');
    }

    try {
      // CSVコンテンツを生成
      const csvContent = generateCSVContent(report, options);
      
      // ファイル名を生成（サイト名_品質チェック_YYYYMMDD.csv）
      const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const siteName = currentSite?.name || currentSite?.url?.replace(/https?:\/\//, '').split('/')[0] || 'site';
      const fileName = `${siteName}_品質チェック_${currentDate}.csv`;
      
      // BOM付きでCSVをダウンロード（Excel対応）
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error('ブラウザがファイルダウンロードをサポートしていません');
      }
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  };

  // CSV コンテンツ生成関数
  const generateCSVContent = (report: QualityCheckReport, options: CSVExportOptions): string => {
    const headers = [
      '記事ID',
      'タイトル',
      'URL',
      'ステータス',
      '総合スコア',
      '古さスコア',
      'AI文章スコア',
      '誤情報リスクスコア',
      '優先度',
      'カテゴリー',
      '最終更新日',
      'リライト推奨理由',
      '推奨アクション',
      '処理時間(ms)',
      'チェック実行日時'
    ];

    if (options.includeAnalysis) {
      headers.push(
        'TextLintエラー数',
        'TextLintメッセージ',
        '誤情報検出問題',
        '古い情報',
        '論理的矛盾',
        'SEO推奨事項',
        '読みやすさ改善案'
      );
    }

    const csvRows = [headers.join(',')];

    const filteredResults = report.results.filter(result => 
      options.filterByStatus?.includes(result.status) ?? true
    );

    filteredResults.forEach(result => {
      const row = [
        result.postId.toString(),
        `"${result.title.replace(/"/g, '""')}"`,
        result.url,
        result.status,
        result.overallScore.toString(),
        result.ageScore.toString(),
        result.aiTextScore.toString(),
        result.misinformationScore.toString(),
        result.priority,
        `"${result.categories.map(c => c.name).join(', ')}"`,
        new Date(result.lastModified).toISOString().split('T')[0],
        `"${result.rewriteReasons.join('; ').replace(/"/g, '""')}"`,
        `"${result.recommendedActions.join('; ').replace(/"/g, '""')}"`,
        result.processingTime.toString(),
        new Date(result.checkedAt).toISOString().replace('T', ' ').split('.')[0]
      ];

      if (options.includeAnalysis) {
        row.push(
          result.textlintResult.messages.length.toString(),
          `"${result.textlintResult.messages.map(m => `${m.ruleId}: ${m.message}`).join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.misinformationRisk.issues.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.recencyCheck.outdatedInfo.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.logicalConsistency.inconsistencies.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.seoAnalysis.recommendations.join('; ').replace(/"/g, '""')}"`,
          `"${result.geminiAnalysis.readabilityScore.suggestions.join('; ').replace(/"/g, '""')}"`
        );
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  // ステップの進行可否チェック
  const canProceedToStep = (step: number): boolean => {
    switch (step) {
      case 1: // 実行ステップ
        return !!currentSite && categories.length > 0 && sites.length > 0;
      case 2: // 結果確認ステップ
        return !!report && progress.status === 'completed';
      case 3: // エクスポートステップ
        return !!report;
      default:
        return true;
    }
  };

  // ステップの内容をレンダリング
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {sites.length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                WordPressサイトが設定されていません。設定ページでサイトを追加してください。
              </Alert>
            )}
            
            {sites.length > 0 && !currentSite && (
              <Alert severity="info" sx={{ mb: 2 }}>
                サイトを選択してください。メニューからサイトを選択するか、設定ページで現在のサイトを設定してください。
              </Alert>
            )}
            
            {!config?.geminiApiKey && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>💡 推奨設定</strong><br />
                Gemini APIキーを設定すると、より詳細なAI分析（誤情報チェック、SEO分析等）が利用できます。
              </Alert>
            )}

            {loading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">カテゴリーを読み込み中...</Typography>
              </Box>
            )}

            {currentSite && categories.length > 0 && (
              <CheckConfigForm
                config={checkConfig}
                onChange={setCheckConfig}
                categories={categories}
                site={currentSite}
                disabled={loading}
              />
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={() => setActiveStep(1)}
                disabled={!canProceedToStep(1)}
                startIcon={<PlayIcon />}
              >
                品質チェック開始
              </Button>
              
              <Button
                variant="outlined"
                onClick={loadCategories}
                disabled={!currentSite || loading || sites.length === 0}
              >
                カテゴリー再読み込み
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <ProgressDisplay
              progress={progress}
              onCancel={cancelQualityCheck}
              canCancel={['fetching', 'analyzing'].includes(progress.status)}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(0)}
                disabled={['fetching', 'analyzing'].includes(progress.status)}
              >
                設定に戻る
              </Button>
              
              {progress.status === 'idle' && (
                <Button
                  variant="contained"
                  onClick={startQualityCheck}
                  startIcon={<PlayIcon />}
                >
                  開始
                </Button>
              )}
              
              {progress.status === 'completed' && (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(2)}
                  startIcon={<AssessmentIcon />}
                >
                  結果を確認
                </Button>
              )}
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            {report && (
              <ResultsTable
                report={report}
                onResultClick={(result) => {
                  console.log('Result clicked:', result);
                  // 詳細表示モーダルなどを実装する場合はここで処理
                }}
              />
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(1)}
              >
                戻る
              </Button>
              
              <Button
                variant="contained"
                onClick={() => setActiveStep(3)}
                startIcon={<GetAppIcon />}
                disabled={!report}
              >
                エクスポート
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            {report && (
              <ReportGenerator
                report={report}
                onExport={handleCustomExport}
              />
            )}

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => setActiveStep(2)}
              >
                結果に戻る
              </Button>
              
              <Button
                variant="contained"
                onClick={() => {
                  // 新しいチェックを開始
                  setActiveStep(0);
                  setReport(null);
                  setProgress({
                    total: 0,
                    current: 0,
                    currentTitle: '',
                    percentage: 0,
                    status: 'idle',
                    errors: []
                  });
                  setError(null);
                }}
              >
                新しいチェックを開始
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          WordPress記事品質チェック
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          AI技術を活用してWordPress記事の品質を自動チェックし、改善が必要な記事を特定します。
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel>
                  <Typography variant="h6">{step.label}</Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {step.description}
                  </Typography>
                  
                  <Fade in={activeStep === index} timeout={300}>
                    <Box>{renderStepContent(index)}</Box>
                  </Fade>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </Paper>
      </Box>
    </Container>
  );
}