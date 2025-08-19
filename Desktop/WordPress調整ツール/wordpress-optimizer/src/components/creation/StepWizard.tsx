import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Input as InputIcon,
  AutoFixHigh as AIIcon,
  Edit as EditIcon,
  Publish as PublishIcon,
  Category as CategoryIcon,
  Analytics as AnalyticsIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

export type StepType = 'category-selection' | 'csv-generation' | 'input' | 'ai-generation' | 'ai-result' | 'editing';

export interface StepWizardProps {
  currentStep: StepType;
  onStepChange?: (step: StepType) => void;
  children?: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
}

interface StepInfo {
  id: StepType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const steps: StepInfo[] = [
  {
    id: 'category-selection',
    label: 'カテゴリー選択',
    description: '記事を投稿するカテゴリーを選択してください',
    icon: <CategoryIcon />,
  },
  {
    id: 'csv-generation',
    label: 'データ分析',
    description: '既存記事データを分析・CSV化します',
    icon: <AnalyticsIcon />,
  },
  {
    id: 'input',
    label: '入力・要求事項',
    description: 'ファイルアップロードまたは直接入力を選択してください',
    icon: <InputIcon />,
  },
  {
    id: 'ai-generation',
    label: 'AI提案生成中',
    description: '既存データを活用してAI提案を生成します',
    icon: <AIIcon />,
  },
  {
    id: 'ai-result',
    label: 'AI提案確認',
    description: 'AI提案結果を確認・選択してください',
    icon: <PsychologyIcon />,
  },
  {
    id: 'editing',
    label: '記事編集',
    description: '提案された内容を確認・編集します',
    icon: <EditIcon />,
  },
];

function StepWizard({
  currentStep,
  onStepChange,
  children,
  orientation = 'auto',
}: StepWizardProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // レスポンシブ対応: モバイルでは縦向き、デスクトップでは横向き
  const stepperOrientation = orientation === 'auto' 
    ? (isMobile ? 'vertical' : 'horizontal')
    : orientation;

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const getStepIcon = (stepId: StepType) => {
    const step = steps.find(s => s.id === stepId);
    return step?.icon || <InputIcon />;
  };

  const isStepCompleted = (stepId: StepType) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    return stepIndex < currentStepIndex;
  };

  const isStepActive = (stepId: StepType) => {
    return stepId === currentStep;
  };

  const handleStepClick = (stepId: StepType) => {
    if (onStepChange) {
      onStepChange(stepId);
    }
  };

  return (
    <Box sx={{ width: '100%', mb: 3 }}>
      {stepperOrientation === 'horizontal' ? (
        <Stepper 
          activeStep={currentStepIndex} 
          orientation="horizontal"
          sx={{ mb: 3 }}
        >
          {steps.map((step, index) => (
            <Step
              key={step.id}
              completed={isStepCompleted(step.id)}
              active={isStepActive(step.id)}
            >
              <StepLabel
                icon={getStepIcon(step.id)}
                onClick={() => handleStepClick(step.id)}
                sx={{
                  cursor: onStepChange ? 'pointer' : 'default',
                  '& .MuiStepLabel-label': {
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    fontWeight: isStepActive(step.id) ? 600 : 400,
                  },
                }}
              >
                <Typography variant="body2" component="span">
                  {step.label}
                </Typography>
                {!isMobile && (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    display="block"
                    sx={{ mt: 0.5 }}
                  >
                    {step.description}
                  </Typography>
                )}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      ) : (
        <Stepper 
          activeStep={currentStepIndex} 
          orientation="vertical"
          sx={{ mb: 3 }}
        >
          {steps.map((step, index) => (
            <Step
              key={step.id}
              completed={isStepCompleted(step.id)}
              active={isStepActive(step.id)}
            >
              <StepLabel
                icon={getStepIcon(step.id)}
                onClick={() => handleStepClick(step.id)}
                sx={{
                  cursor: onStepChange ? 'pointer' : 'default',
                  '& .MuiStepLabel-label': {
                    fontWeight: isStepActive(step.id) ? 600 : 400,
                  },
                }}
              >
                <Typography variant="body1" component="div">
                  {step.label}
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ mt: 0.5 }}
                >
                  {step.description}
                </Typography>
              </StepLabel>
              
              {isStepActive(step.id) && children && (
                <StepContent>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    {children}
                  </Box>
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>
      )}

      {/* 横向きレイアウトでのコンテンツ表示 */}
      {stepperOrientation === 'horizontal' && children && (
        <Box sx={{ mt: 3 }}>
          {children}
        </Box>
      )}
    </Box>
  );
}

export default StepWizard;