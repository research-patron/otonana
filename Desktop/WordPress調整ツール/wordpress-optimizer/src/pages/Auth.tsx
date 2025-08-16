import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Tabs,
  Tab,
  Link,
} from '@mui/material';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAppStore } from '../store';

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
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Auth() {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [tabValue, setTabValue] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // ログイン済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setMessage('');
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage('メールアドレスとパスワードを入力してください', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage('ログインしました', 'success');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'ログインに失敗しました';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが間違っています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showMessage('すべての項目を入力してください', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('パスワードが一致しません', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage('パスワードは6文字以上で入力してください', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showMessage('アカウントを作成しました', 'success');
    } catch (error: any) {
      console.error('Register error:', error);
      let errorMessage = 'アカウント作成に失敗しました';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'このメールアドレスは既に使用されています';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'パスワードが弱すぎます';
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  const handlePasswordReset = async () => {
    if (!email) {
      showMessage('メールアドレスを入力してください', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showMessage('パスワードリセットメールを送信しました', 'success');
    } catch (error: any) {
      console.error('Password reset error:', error);
      let errorMessage = 'パスワードリセットに失敗しました';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'ユーザーが見つかりません';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません';
      }
      
      showMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          WordPress記事最適化ツール
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
          AIを活用したWordPress記事作成支援
        </Typography>

        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="認証タブ">
              <Tab label="ログイン" />
              <Tab label="アカウント作成" />
            </Tabs>
          </Box>

          {/* ログインタブ */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h5" gutterBottom>
              ログイン
            </Typography>
            
            <TextField
              fullWidth
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
            />

            <Box sx={{ mt: 3, mb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? 'ログイン中...' : 'ログイン'}
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={handlePasswordReset}
                disabled={isLoading}
              >
                パスワードを忘れた方はこちら
              </Link>
            </Box>
          </TabPanel>

          {/* アカウント作成タブ */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom>
              アカウント作成
            </Typography>
            
            <TextField
              fullWidth
              label="メールアドレス"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="パスワード"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              helperText="6文字以上で入力してください"
            />

            <TextField
              fullWidth
              label="パスワード（確認）"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
            />

            <Box sx={{ mt: 3, mb: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? 'アカウント作成中...' : 'アカウント作成'}
              </Button>
            </Box>
          </TabPanel>

          {message && (
            <CardContent>
              <Alert severity={messageType}>{message}</Alert>
            </CardContent>
          )}
        </Card>
      </Box>
    </Container>
  );
}

export default Auth;