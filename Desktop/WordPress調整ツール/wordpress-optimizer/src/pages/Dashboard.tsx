import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Article as ArticleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAppStore } from '../store';
import { getScheduledPosts } from '../services/wordpress';
import type { WordPressPost } from '../types';

function Dashboard() {
  const navigate = useNavigate();
  const { config, user } = useAppStore();
  const [scheduledPosts, setScheduledPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(false);

  // 予約投稿を取得
  useEffect(() => {
    const loadScheduledPosts = async () => {
      if (!config?.currentSiteId) return;
      
      const currentSite = config.sites.find(site => site.id === config.currentSiteId);
      if (!currentSite) return;

      try {
        setLoading(true);
        const posts = await getScheduledPosts(currentSite, { per_page: 5 });
        setScheduledPosts(posts);
      } catch (error) {
        console.error('Failed to load scheduled posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadScheduledPosts();
  }, [config?.currentSiteId, config?.sites]);
  
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          WordPress記事最適化ツール
        </Typography>
        
        <Typography variant="h6" color="text.secondary" paragraph>
          AIを活用してWordPress記事の作成・最適化を行います
        </Typography>

        <Alert severity={user ? 'success' : 'info'} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PersonIcon sx={{ mr: 1 }} />
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {user ? 'ログイン中（永続保存）' : 'ゲストモード（セッション保存）'}
              </Typography>
              <Typography variant="body2">
                {user 
                  ? 'すべての機能を利用できます。設定はFirestoreに永続保存されます。'
                  : 'すべての機能をお試しいただけます。設定はセッション中のみ保持されます（リロードでリセット）。'
                }
              </Typography>
            </Box>
          </Box>
        </Alert>

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {/* 新規記事作成 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AddIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">新規記事作成</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  AIの提案を基に新しい記事を作成します
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => navigate('/create')}
                >
                  作成開始
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* 下書き管理 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ArticleIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">下書き管理</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  保存済みの下書きを管理・編集します
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => navigate('/drafts')}
                >
                  下書き一覧
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* 使用統計 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AnalyticsIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">使用統計</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  API使用量や記事作成数を確認します
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" variant="outlined">
                  統計を見る
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* 設定 */}
          <Grid item xs={12} md={6} lg={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SettingsIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">設定</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  APIキーやサイト設定を管理します
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => navigate('/settings')}
                >
                  設定画面
                </Button>
              </CardActions>
            </Card>
          </Grid>

          {/* 予約投稿 */}
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ScheduleIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography variant="h6">予約投稿</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  予定されている記事の投稿スケジュール
                </Typography>
                
                {loading ? (
                  <Typography variant="body2">読み込み中...</Typography>
                ) : scheduledPosts.length > 0 ? (
                  <List dense>
                    {scheduledPosts.map((post) => (
                      <ListItem key={post.id} disablePadding>
                        <ListItemText
                          primary={
                            <Typography variant="body2" noWrap>
                              {post.title.rendered}
                            </Typography>
                          }
                          secondary={`予約日時: ${new Date(post.date).toLocaleDateString('ja-JP', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    予約投稿はありません
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => navigate('/create')}
                >
                  新規予約投稿
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        {/* クイックスタートガイド */}
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              はじめに
            </Typography>
            <Typography variant="body1" paragraph>
              このツールを使用するには、以下の設定が必要です：
            </Typography>
            <Box component="ol" sx={{ pl: 2 }}>
              <li>
                <Typography variant="body2">
                  Gemini APIキーの設定（Google AI Studioで取得）
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  WordPressサイトの接続設定（REST API有効化必須）
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  認証情報の設定（Application Passwords推奨）
                </Typography>
              </li>
            </Box>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                sx={{ mr: 2 }}
                onClick={() => navigate('/settings')}
              >
                初期設定を開始
              </Button>
              <Button 
                variant="outlined"
                onClick={() => window.open('https://github.com/your-username/wordpress-optimizer#readme', '_blank')}
              >
                詳細ガイドを見る
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

export default Dashboard;