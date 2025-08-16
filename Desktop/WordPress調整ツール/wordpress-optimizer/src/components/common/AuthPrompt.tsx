import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Login as LoginIcon, Person as PersonIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface AuthPromptProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

function AuthPrompt({ 
  open, 
  onClose, 
  title = "ログインが必要です",
  message = "この機能を利用するにはアカウント登録またはログインが必要です。",
  feature = "この機能"
}: AuthPromptProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          {title}
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {message}
        </Alert>
        
        <Typography variant="body2" color="text.secondary">
          {feature}を利用するには以下のいずれかを選択してください：
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            アカウント登録のメリット：
          </Typography>
          <ul>
            <li>設定の自動保存・同期</li>
            <li>複数デバイスでの利用</li>
            <li>データのクラウドバックアップ</li>
            <li>高度な機能へのアクセス</li>
          </ul>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          後で
        </Button>
        <Button 
          variant="contained" 
          startIcon={<LoginIcon />}
          onClick={handleLogin}
        >
          ログイン・登録
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AuthPrompt;