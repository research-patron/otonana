import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  Api as ApiIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useStatsStore } from '../store';

function Stats() {
  const { stats } = useStatsStore();

  // 今日の日付
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.substring(0, 7);

  // 今日の統計
  const todayApiCalls = stats.apiCalls.daily[today] || 0;
  const todayTokens = stats.tokensUsed.daily[today] || 0;
  const todayCost = stats.estimatedCost.daily[today] || 0;

  // 今月の統計
  const monthlyApiCalls = stats.apiCalls.monthly[thisMonth] || 0;
  const monthlyTokens = stats.tokensUsed.monthly[thisMonth] || 0;
  const monthlyCost = stats.estimatedCost.monthly[thisMonth] || 0;

  const StatCard = ({ 
    title, 
    value, 
    unit, 
    icon, 
    color = 'primary' 
  }: { 
    title: string; 
    value: number | string; 
    unit: string; 
    icon: React.ReactNode; 
    color?: 'primary' | 'success' | 'warning' | 'error';
  }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 1, color: `${color}.main` }}>
            {icon}
          </Box>
          <Typography variant="h6" color={`${color}.main`}>
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div" gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {unit}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          使用統計
        </Typography>
        
        <Typography variant="h6" color="text.secondary" paragraph>
          AI記事生成の利用状況を確認できます
        </Typography>

        <Alert severity="info" sx={{ mb: 4 }}>
          統計データは現在のセッション中のみ保持されます。ページをリロードすると統計はリセットされます。
        </Alert>

        {/* 今日の統計 */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          本日の利用状況
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="API呼び出し"
              value={todayApiCalls}
              unit="回"
              icon={<ApiIcon />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="使用トークン"
              value={todayTokens.toLocaleString()}
              unit="tokens"
              icon={<AnalyticsIcon />}
              color="success"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="推定コスト"
              value={`¥${todayCost.toFixed(2)}`}
              unit="円"
              icon={<TrendingUpIcon />}
              color="warning"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="作成記事数"
              value={stats.articlesCreated}
              unit="記事"
              icon={<ArticleIcon />}
              color="error"
            />
          </Grid>
        </Grid>

        {/* 今月の統計 */}
        <Typography variant="h5" gutterBottom>
          今月の利用状況
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="API呼び出し"
              value={monthlyApiCalls}
              unit="回"
              icon={<ApiIcon />}
              color="primary"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="使用トークン"
              value={monthlyTokens.toLocaleString()}
              unit="tokens"
              icon={<AnalyticsIcon />}
              color="success"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="推定コスト"
              value={`¥${monthlyCost.toFixed(2)}`}
              unit="円"
              icon={<TrendingUpIcon />}
              color="warning"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ mr: 1, color: 'info.main' }}>
                    <AnalyticsIcon />
                  </Box>
                  <Typography variant="h6" color="info.main">
                    利用率
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" gutterBottom>
                  {monthlyApiCalls > 0 ? Math.round((todayApiCalls / monthlyApiCalls) * 100) : 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  今日 / 今月
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={monthlyApiCalls > 0 ? (todayApiCalls / monthlyApiCalls) * 100 : 0}
                  sx={{ height: 8, borderRadius: 5 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {stats.lastUsed && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                最終利用時刻
              </Typography>
              <Typography variant="body1">
                {new Date(stats.lastUsed).toLocaleString('ja-JP')}
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
}

export default Stats;