import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Paper,
  Fade,
} from '@mui/material';
import {
  Category as CategoryIcon,
  Analytics as AnalyticsIcon,
  Psychology as PsychologyIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import CategoryTargetSelector from '../components/ultrathink/CategoryTargetSelector';
import ArticleDataTable from '../components/ultrathink/ArticleDataTable';
import UltrathinkPrompt from '../components/ultrathink/UltrathinkPrompt';
import { getCategories, testSiteConnection } from '../services/wordpress';
import csvManager from '../services/csvManager';
import type { WordPressCategory, CSVManagerState, WordPressSite } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function UltrathinkAI() {
  const { config } = useAppStore();
  const [currentSite, setCurrentSite] = useState<WordPressSite | null>(null);
  const [categories, setCategories] = useState<WordPressCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [csvState, setCsvState] = useState<CSVManagerState | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 現在のサイトを取得
  useEffect(() => {
    if (config && config.sites.length > 0) {
      const site = config.sites.find(s => s.id === config.currentSiteId) || config.sites[0];
      setCurrentSite(site);
    }
  }, [config]);

  // サイト変更時の初期化
  useEffect(() => {
    if (currentSite) {
      initializeSiteData();
    }
  }, [currentSite]);

  // サイトデータの初期化
  const initializeSiteData = async () => {
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

      // 既存のCSV状態を読み込み
      const existingCsvState = csvManager.getCSVState(currentSite.id);
      if (existingCsvState) {
        setCsvState(existingCsvState);
        setSelectedCategoryIds(existingCsvState.selectedCategoryIds);
        
        // データがある場合はステップ2に進む
        if (existingCsvState.csvData.length > 0) {
          setActiveStep(1);
        }
      }
    } catch (error) {
      console.error('Site initialization failed:', error);
      setError(error instanceof Error ? error.message : 'サイトの初期化に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // CSV更新時の処理
  const handleCSVUpdate = (newCsvState: CSVManagerState) => {
    setCsvState(newCsvState);
    
    // CSV生成が完了したら次のステップに進む
    if (newCsvState.csvData.length > 0 && activeStep === 0) {
      setActiveStep(1);
    }
  };

  // ステップ進行
  const handleStepNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleStepBack = () => {
    setActiveStep(prev => prev - 1);
  };

  // タブ変更
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 選択記事のエクスポート
  const handleExportSelected = (selectedArticles: any[]) => {
    if (selectedArticles.length === 0) return;
    
    try {
      const filename = `selected_articles_${new Date().toISOString().split('T')[0]}.csv`;
      csvManager.exportAsCSV(selectedArticles, filename);
    } catch (error) {
      console.error('Export failed:', error);
      setError('エクスポートに失敗しました');
    }
  };

  // 選択記事の分析
  const handleAnalyzeSelected = (selectedArticles: any[]) => {
    if (selectedArticles.length === 0) return;
    
    console.log('Analyzing selected articles:', selectedArticles);
    // 分析機能は今後実装
    setError('記事分析機能は開発中です');
  };

  // ロード中表示
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            サイトデータを読み込み中...
          </Typography>
        </Box>
      </Container>
    );
  }

  // サイトが未設定の場合
  if (!currentSite) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          WordPressサイトが設定されていません。
          設定ページからサイトを追加してください。
        </Alert>
      </Container>
    );
  }

  const steps = [
    {
      label: 'カテゴリー選択・CSV生成',
      description: '分析対象のカテゴリーを選択し、記事データを収集します',
      content: (
        <CategoryTargetSelector
          site={currentSite}
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onCategoryChange={setSelectedCategoryIds}
          onCSVUpdate={handleCSVUpdate}
        />
      ),
    },
    {
      label: 'データ確認・分析',
      description: '収集した記事データを確認し、必要に応じて調整します',
      content: (
        <Box>
          <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab
              icon={<TableChartIcon />}
              iconPosition="start"
              label={`記事データ (${csvState?.csvData.length || 0})`}
            />
            <Tab
              icon={<AnalyticsIcon />}
              iconPosition="start"
              label="分析・統計"
              disabled={!csvState || csvState.csvData.length === 0}
            />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {csvState && (
              <ArticleDataTable
                articles={csvState.csvData}
                onExportSelected={handleExportSelected}
                onAnalyzeSelected={handleAnalyzeSelected}
              />
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              記事データ分析
            </Typography>
            <Typography variant="body2" color="text.secondary">
              詳細な分析機能は開発中です
            </Typography>
          </TabPanel>
        </Box>
      ),
    },
    {
      label: 'AI提案生成',
      description: '既存記事データを活用して戦略的なコンテンツ提案を生成します',
      content: csvState && selectedCategoryIds.length > 0 ? (
        <UltrathinkPrompt
          site={currentSite}
          csvData={csvState.csvData}
          selectedCategories={categories.filter(cat => selectedCategoryIds.includes(cat.id))}
        />
      ) : (
        <Alert severity="warning">
          カテゴリーを選択してCSVデータを生成してください
        </Alert>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PsychologyIcon color="primary" fontSize="large" />
          Ultrathink AI提案
        </Typography>
        <Typography variant="body1" color="text.secondary">
          既存記事データベースを分析し、SEOに最適化された戦略的コンテンツを提案
        </Typography>
        
        {currentSite && (
          <Alert severity="info" sx={{ mt: 2 }}>
            対象サイト: <strong>{currentSite.name || currentSite.url}</strong>
          </Alert>
        )}
      </Box>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ステッパー */}
      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>
                <Typography variant="h6">{step.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </StepLabel>
              <StepContent>
                <Fade in={activeStep === index} timeout={500}>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    {step.content}
                  </Box>
                </Fade>

                {/* ナビゲーションボタン */}
                <Box sx={{ mt: 3, mb: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleStepNext}
                    disabled={
                      (index === 0 && !csvState) ||
                      (index === 1 && (!csvState || csvState.csvData.length === 0)) ||
                      index === steps.length - 1
                    }
                    sx={{ mr: 1 }}
                  >
                    {index === steps.length - 1 ? '完了' : '次へ'}
                  </Button>
                  
                  <Button
                    disabled={index === 0}
                    onClick={handleStepBack}
                  >
                    戻る
                  </Button>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* 進行状況サマリー */}
      {csvState && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            進行状況
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                選択カテゴリー
              </Typography>
              <Typography variant="h6">
                {selectedCategoryIds.length}個
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                分析記事数
              </Typography>
              <Typography variant="h6">
                {csvState.totalArticles}記事
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                最終更新
              </Typography>
              <Typography variant="body2">
                {new Date(csvState.lastUpdated).toLocaleString('ja-JP')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}
    </Container>
  );
}

export default UltrathinkAI;