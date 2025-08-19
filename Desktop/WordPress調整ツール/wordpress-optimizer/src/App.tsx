import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ja } from 'date-fns/locale';
import { lightTheme, darkTheme } from './config/theme';
import { useAppStore } from './store';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/common/LoadingScreen';
import Settings from './pages/Settings';
import CreateArticle from './pages/CreateArticle';
import DraftsList from './pages/DraftsList';
import EditDraft from './pages/EditDraft';
import QualityCheck from './pages/QualityCheck';
import RewriteSuggestions from './pages/RewriteSuggestions';

function App() {
  const { config, isInitialized, initialize } = useAppStore();
  
  useEffect(() => {
    if (!isInitialized) {
      console.log('Starting app initialization...');
      initialize().catch(console.error);
    }
  }, [isInitialized, initialize]);

  const theme = config?.ui.darkMode ? darkTheme : lightTheme;

  // 最低限の初期化が完了するまで待機
  if (!isInitialized) {
    return (
      <ThemeProvider theme={lightTheme}>
        <CssBaseline />
        <LoadingScreen message="アプリケーションを初期化中..." />
      </ThemeProvider>
    );
  }

  // 認証状態に関係なく、基本機能を表示
  // ゲストモード：認証なしでも基本機能が見れる
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ja}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<CreateArticle />} />
              <Route path="/create" element={<CreateArticle />} />
              <Route path="/drafts" element={<DraftsList />} />
              <Route path="/edit/:draftId" element={<EditDraft />} />
              <Route path="/quality-check" element={<QualityCheck />} />
              <Route path="/rewrite-suggestions" element={<RewriteSuggestions />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
