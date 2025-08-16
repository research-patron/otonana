import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Grid,
} from '@mui/material';
import {
  Key as KeyIcon,
  Language as LanguageIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  Visibility,
  VisibilityOff,
  CloudSync,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { testWordPressConnection } from '../services/wordpress';
import { testGeminiConnection } from '../services/gemini';
import type { WordPressSite, AppConfig } from '../types';
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const { 
    config, 
    user,
    setConfig, 
    updateGeminiApiKey, 
    updateSites, 
    toggleDarkMode,
    updateSites: updateSitesInStore,
    createBackup,
    restoreFromBackup
  } = useAppStore();

  const [tabValue, setTabValue] = useState(0);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-pro');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [geminiStatus, setGeminiStatus] = useState<string>('');
  const [siteStatus, setSiteStatus] = useState<string>('');
  const [sites, setSites] = useState<WordPressSite[]>([]);
  
  // サイト追加フォーム
  const [newSite, setNewSite] = useState({
    url: '',
    authMethod: 'application-passwords' as 'application-passwords' | 'basic',
    username: '',
    password: '',
  });
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [isTestingSiteConnection, setIsTestingSiteConnection] = useState(false);
  const [connectionTestPassed, setConnectionTestPassed] = useState(false);

  // 初期化処理（設定が変更された時に UI を更新）
  useEffect(() => {
    if (config) {
      console.log('Config loaded:', config);
      setGeminiApiKey(config.geminiApiKey || '');
      setSelectedModel(config.selectedModel || 'gemini-2.5-pro');
      setSystemPrompt(config.prompts?.system || '');
      setSites(config.sites || []);
    }
  }, [config]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Gemini API設定の自動保存
  const saveGeminiSettings = async () => {
    try {
      if (config) {
        const updatedConfig = {
          ...config,
          geminiApiKey: geminiApiKey,
          selectedModel: selectedModel,
          prompts: {
            ...config.prompts,
            system: systemPrompt,
          },
        };
        setConfig(updatedConfig);
        updateGeminiApiKey(geminiApiKey);
      }
      setGeminiStatus('設定をセッションに保存しました');
    } catch (error: any) {
      console.error('Settings save error:', error);
      const errorMessage = error?.message || '設定の保存に失敗しました';
      setGeminiStatus(`保存エラー: ${errorMessage}`);
    }
  };


  const handleTestConnection = async () => {
    if (!geminiApiKey) {
      setGeminiStatus('APIキーを入力してください');
      return;
    }

    setIsTestingConnection(true);
    try {
      const result = await testGeminiConnection(geminiApiKey, selectedModel);
      if (result.success) {
        // 接続テスト成功時に自動保存
        await saveGeminiSettings();
        setGeminiStatus('Gemini APIへの接続に成功し、設定を保存しました');
      } else {
        setGeminiStatus(`接続エラー: ${result.error}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setGeminiStatus('接続テストに失敗しました');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDeleteSite = (siteId: string) => {
    const updatedSites = sites.filter(site => site.id !== siteId);
    setSites(updatedSites);
    updateSitesInStore(updatedSites);
    setSiteStatus('サイトを削除しました');
  };

  const handleTestSiteConnection = async () => {
    if (!newSite.url || !newSite.username || !newSite.password) {
      setSiteStatus('必須項目を入力してください');
      return;
    }

    setIsTestingSiteConnection(true);
    setConnectionTestPassed(false);
    setSiteStatus('WordPressサイトへの接続をテスト中...');
    
    try {
      const testResult = await testWordPressConnection({
        url: newSite.url.endsWith('/') ? newSite.url.slice(0, -1) : newSite.url,
        authMethod: newSite.authMethod,
        username: newSite.username,
        password: newSite.password,
      });
      
      if (testResult.success) {
        setConnectionTestPassed(true);
        setSiteStatus('接続テスト成功！サイトを保存できます。');
      } else {
        setConnectionTestPassed(false);
        setSiteStatus(`接続エラー: ${testResult.message}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setConnectionTestPassed(false);
      setSiteStatus('接続テストに失敗しました');
    } finally {
      setIsTestingSiteConnection(false);
    }
  };

  const handleSaveSite = async () => {
    if (!connectionTestPassed) {
      setSiteStatus('先に接続テストを実行してください');
      return;
    }

    setIsSavingSite(true);
    
    try {
      const site: WordPressSite = {
        id: Date.now().toString(),
        url: newSite.url.endsWith('/') ? newSite.url.slice(0, -1) : newSite.url,
        authMethod: newSite.authMethod,
        username: newSite.username,
        password: newSite.password,
        customHeaders: {},
        restApiUrl: '',
      };

      // サイトを保存
      const updatedSites = [...sites, site];
      setSites(updatedSites);
      updateSitesInStore(updatedSites);
      
      // 初回サイト追加時は自動的に現在のサイトとして設定
      if (sites.length === 0 && config) {
        setConfig({
          ...config,
          sites: updatedSites,
          currentSiteId: site.id,
        });
      }
      
      // サイト追加フォームをクリア
      setNewSite({
        url: '',
        authMethod: 'application-passwords',
        username: '',
        password: '',
      });
      setConnectionTestPassed(false);
      setSiteStatus('サイトをセッションに保存しました');
    } catch (error) {
      console.error('Site save error:', error);
      setSiteStatus('サイト追加に失敗しました');
    } finally {
      setIsSavingSite(false);
    }
  };

  const handleClearSite = () => {
    setNewSite({
      url: '',
      authMethod: 'application-passwords',
      username: '',
      password: '',
    });
    setConnectionTestPassed(false);
    setSiteStatus('');
  };


  const handleCreateBackup = async () => {
    try {
      // 現在のUIの状態を含めた最新の設定を作成
      const currentConfig: AppConfig = {
        geminiApiKey: geminiApiKey, // UIから最新のAPIキーを取得
        selectedModel: selectedModel,
        sites: sites,
        prompts: {
          system: systemPrompt,
          templates: config?.prompts?.templates || [],
        },
        ui: config?.ui || {
          darkMode: false,
          language: 'ja',
        },
        currentSiteId: config?.currentSiteId,
      };
      
      console.log('Exporting config:', currentConfig);
      console.log('Gemini API Key in export:', geminiApiKey);
      
      // バックアップデータを作成
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        config: currentConfig,
        source: 'session',
      };
      
      const backupData = JSON.stringify(backup, null, 2);
      console.log('Backup data:', backupData);
      
      const blob = new Blob([backupData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wp-optimizer-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setConnectionStatus('設定ファイルをダウンロードしました');
    } catch (error) {
      console.error('Backup error:', error);
      setConnectionStatus('エクスポートに失敗しました');
    }
  };

  const handleRestoreFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      let restoredConfig: AppConfig | null = null;
      
      try {
        const backupData = e.target?.result as string;
        restoredConfig = await restoreFromBackup(backupData);
        console.log('Backup restoration successful, updating UI...');
      } catch (error) {
        console.error('Backup restoration failed:', error);
        setConnectionStatus('インポートに失敗しました');
        return;
      }

      // バックアップ復元が成功した場合のみUI更新を実行
      try {
        // UIの状態を更新
        setGeminiApiKey(restoredConfig.geminiApiKey || '');
        setSelectedModel(restoredConfig.selectedModel || 'gemini-2.5-pro');
        setSystemPrompt(restoredConfig.prompts?.system || '');
        setSites(restoredConfig.sites || []);
        
        // ストアにも設定を保存
        if (config) {
          setConfig({
            ...config,
            ...restoredConfig,
            // UI状態も反映
            geminiApiKey: restoredConfig.geminiApiKey || '',
            selectedModel: restoredConfig.selectedModel || 'gemini-2.5-pro',
            sites: restoredConfig.sites || [],
            prompts: {
              system: restoredConfig.prompts?.system || '',
              templates: restoredConfig.prompts?.templates || [],
            }
          });
        }
        
        setConnectionStatus('設定を復元しました（APIキーと全てのサイト情報を含む）');
      } catch (uiError) {
        console.warn('UI update had issues but restoration was successful:', uiError);
        // 復元は成功したが、UI更新で問題があった場合も成功メッセージを表示
        setConnectionStatus('設定を復元しました（APIキーと全てのサイト情報を含む）');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          設定
        </Typography>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="設定タブ">
              <Tab 
                icon={<KeyIcon />} 
                label="設定" 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* 設定タブ */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h5" gutterBottom>
              設定
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3 }}>
              設定は現在のセッション中のみ保持されます（ページリロードでリセット）。永続保存にはエクスポート機能をご利用ください。
            </Alert>

            <Typography variant="h6" gutterBottom>
              Gemini API設定
            </Typography>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Gemini API Key"
                type={showApiKey ? "text" : "password"}
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                helperText="Google AI StudioでAPIキーを取得してください"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="APIキーの表示を切り替え"
                        onClick={() => setShowApiKey(!showApiKey)}
                        edge="end"
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>使用モデル</InputLabel>
                <Select
                  value={selectedModel}
                  label="使用モデル"
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  <MenuItem value="gemini-2.5-pro">Gemini 2.5 Pro (高品質)</MenuItem>
                  <MenuItem value="gemini-2.5-flash">Gemini 2.5 Flash (高速・低コスト)</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleTestConnection}
                  disabled={!geminiApiKey || isTestingConnection}
                >
                  {isTestingConnection ? '接続中...' : '接続テスト'}
                </Button>
              </Box>
              
              {geminiStatus && (
                <Alert 
                  severity={
                    geminiStatus.includes('成功') || 
                    geminiStatus.includes('保存しました')
                      ? 'success' 
                      : geminiStatus.includes('エラー') || geminiStatus.includes('失敗')
                      ? 'error'
                      : 'info'
                  } 
                  sx={{ mt: 2 }}
                >
                  {geminiStatus}
                </Alert>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              プロンプト設定
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="システムプロンプト"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="あなたは経験豊富なWebコンテンツライターです..."
              helperText="AIの応答スタイルを設定します"
            />

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              WordPress REST API 設定
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              現在設定されているサイト：{sites.length > 0 ? sites.map(site => site.url).join(', ') : '未設定'}
            </Typography>

            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              新しいサイトを追加
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="サイトURL"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                  placeholder="https://example.com"
                  helperText="トレーリングスラッシュなし"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>認証方式</InputLabel>
                  <Select
                    value={newSite.authMethod}
                    label="認証方式"
                    onChange={(e) => setNewSite({ ...newSite, authMethod: e.target.value as any })}
                  >
                    <MenuItem value="application-passwords">Application Passwords（推奨）</MenuItem>
                    <MenuItem value="basic">Basic認証</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="ユーザー名"
                  value={newSite.username}
                  onChange={(e) => setNewSite({ ...newSite, username: e.target.value })}
                  placeholder="admin"
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="パスワード"
                  type="password"
                  value={newSite.password}
                  onChange={(e) => setNewSite({ ...newSite, password: e.target.value })}
                  placeholder={newSite.authMethod === 'application-passwords' ? 'Application Password' : 'パスワード'}
                  helperText={newSite.authMethod === 'application-passwords' ? 'WordPressで生成したApplication Password' : ''}
                  size="small"
                />
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleTestSiteConnection}
                    disabled={isTestingSiteConnection || !newSite.url || !newSite.username || !newSite.password}
                  >
                    {isTestingSiteConnection ? '接続テスト中...' : '接続テスト'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveSite}
                    disabled={isSavingSite || !connectionTestPassed}
                  >
                    {isSavingSite ? 'サイト追加中...' : 'サイトを追加'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleClearSite}
                  >
                    クリア
                  </Button>
                </Box>
              </Grid>
            </Grid>

            <Alert severity="info" sx={{ mb: 3 }}>
              <strong>Application Passwords について:</strong><br/>
              WordPress管理画面の「ユーザー &gt; あなたのプロフィール」から新しいApplication Passwordを作成し、
              生成されたパスワードを上記のパスワード欄に入力してください。
            </Alert>

            {sites.length > 0 && (
              <>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                  登録済みサイト
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                  {sites.map((site) => (
                    <Card key={site.id} variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              {site.url}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              認証: {site.authMethod}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ユーザー: {site.username}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="error"
                              onClick={() => handleDeleteSite(site.id)}
                            >
                              削除
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </>
            )}

            {siteStatus && (
              <Alert 
                severity={
                  siteStatus.includes('成功') || 
                  siteStatus.includes('保存しました') || 
                  siteStatus.includes('削除しました')
                    ? 'success' 
                    : siteStatus.includes('エラー') || siteStatus.includes('失敗')
                    ? 'error'
                    : 'info'
                } 
                sx={{ mt: 2 }}
              >
                {siteStatus}
              </Alert>
            )}
            
            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              設定のエクスポート・インポート
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={<CloudSync />}
                onClick={handleCreateBackup}
              >
                設定をエクスポート
              </Button>
              <Button variant="outlined" component="label">
                設定をインポート
                <input 
                  type="file" 
                  hidden 
                  accept=".json" 
                  onChange={handleRestoreFromFile}
                />
              </Button>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              設定をJSONファイルとしてエクスポートし、別のセッションでインポートできます。
            </Typography>

            {connectionStatus && (
              <Alert 
                severity={
                  connectionStatus.includes('成功') || 
                  connectionStatus.includes('保存しました') || 
                  connectionStatus.includes('ダウンロードしました') || 
                  connectionStatus.includes('復元しました') ||
                  connectionStatus.includes('追加しました')
                    ? 'success' 
                    : connectionStatus.includes('エラー') || connectionStatus.includes('失敗')
                    ? 'error'
                    : 'info'
                } 
                sx={{ mt: 2 }}
              >
                {connectionStatus}
              </Alert>
            )}
          </TabPanel>

        </Card>

        {/* UI設定 */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              表示設定
            </Typography>
            <FormControlLabel
              control={<Switch checked={config?.ui.darkMode || false} onChange={toggleDarkMode} />}
              label="ダークモード"
            />
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default Settings;