import { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Add as AddIcon,
  Article as ArticleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Language as LanguageIcon,
  DarkMode as DarkModeIcon,
  Logout as LogoutIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';

const DRAWER_WIDTH = 280;

interface LayoutProps {
  children: React.ReactNode;
}

function Layout({ children }: LayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { config, user, toggleDarkMode, setCurrentSite } = useAppStore();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };


  const menuItems = [
    {
      text: 'ダッシュボード',
      icon: <DashboardIcon />,
      path: '/',
    },
    {
      text: '新規作成',
      icon: <AddIcon />,
      path: '/create',
    },
    {
      text: '下書き管理',
      icon: <ArticleIcon />,
      path: '/drafts',
    },
    {
      text: 'プロンプト履歴',
      icon: <HistoryIcon />,
      path: '/prompt-history',
    },
    {
      text: '使用統計',
      icon: <AnalyticsIcon />,
      path: '/stats',
    },
    {
      text: '設定',
      icon: <SettingsIcon />,
      path: '/settings',
    },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
          WP Optimizer
        </Typography>
      </Toolbar>
      
      {/* サイト選択 */}
      {config && config.sites.length > 0 && (
        <Box sx={{ p: 2 }}>
          <FormControl fullWidth size="small">
            <Select
              value={config.currentSiteId || ''}
              onChange={(e) => setCurrentSite(e.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                サイトを選択
              </MenuItem>
              {config.sites.map((site) => (
                <MenuItem key={site.id} value={site.id}>
                  {site.name || site.url}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* サイト分析サマリー */}
      {config?.currentSiteId && (
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            サイト情報
          </Typography>
          <Typography variant="body2">
            記事数: --
          </Typography>
          <Typography variant="body2">
            カテゴリー: --
          </Typography>
          <Typography variant="body2">
            最終分析: --
          </Typography>
        </Box>
      )}

      {/* UI設定 */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <FormControlLabel
          control={
            <Switch
              checked={config?.ui.darkMode || false}
              onChange={toggleDarkMode}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <DarkModeIcon sx={{ mr: 1, fontSize: '1rem' }} />
              <Typography variant="body2">ダークモード</Typography>
            </Box>
          }
        />
      </Box>

    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* アプリバー */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="メニューを開く"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ flexGrow: 1 }}>
            {/* パンくずリストやページタイトルをここに追加可能 */}
          </Box>

          {/* 言語切り替えボタン（将来実装） */}
          <IconButton color="inherit">
            <LanguageIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ドロワー */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
        aria-label="メインナビゲーション"
      >
        {/* モバイル用ドロワー */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* デスクトップ用ドロワー */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              display: 'flex',
              flexDirection: 'column',
              height: '100vh',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* メインコンテンツ */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;