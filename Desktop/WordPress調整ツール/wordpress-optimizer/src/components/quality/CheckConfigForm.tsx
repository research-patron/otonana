import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  TextField,
  Autocomplete,
  Chip,
  Button,
  Grid,
  Divider,
  Alert,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { STATUS_TRANSLATIONS, getCategoryHierarchicalLabel } from '../../utils/categoryUtils';
import type { 
  QualityCheckConfig, 
  WordPressCategory, 
  WordPressSite 
} from '../../types';

interface CheckConfigFormProps {
  config: QualityCheckConfig;
  onChange: (config: QualityCheckConfig) => void;
  categories: WordPressCategory[];
  site: WordPressSite;
  disabled?: boolean;
}

export default function CheckConfigForm({
  config,
  onChange,
  categories,
  site,
  disabled = false
}: CheckConfigFormProps) {
  const [expandedSections, setExpandedSections] = useState({
    filters: true,
    scoring: false,
    textlint: false,
    gemini: false
  });

  const [dateRange, setDateRange] = useState({
    from: config.filters.dateRange?.from ? new Date(config.filters.dateRange.from) : null,
    to: config.filters.dateRange?.to ? new Date(config.filters.dateRange.to) : null
  });

  // 日付変更の処理
  useEffect(() => {
    const newDateRange = dateRange.from && dateRange.to ? {
      from: dateRange.from.toISOString().split('T')[0],
      to: dateRange.to.toISOString().split('T')[0]
    } : undefined;

    if (JSON.stringify(newDateRange) !== JSON.stringify(config.filters.dateRange)) {
      onChange({
        ...config,
        filters: {
          ...config.filters,
          dateRange: newDateRange
        }
      });
    }
  }, [dateRange.from, dateRange.to]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const updateFilters = (updates: Partial<typeof config.filters>) => {
    onChange({
      ...config,
      filters: {
        ...config.filters,
        ...updates
      }
    });
  };

  const updateScoring = (updates: Partial<typeof config.scoring>) => {
    onChange({
      ...config,
      scoring: {
        ...config.scoring,
        ...updates
      }
    });
  };

  const updateTextlintRules = (updates: Partial<typeof config.textlintRules>) => {
    onChange({
      ...config,
      textlintRules: {
        ...config.textlintRules,
        ...updates
      }
    });
  };

  const updateGeminiAnalysis = (updates: Partial<typeof config.geminiAnalysis>) => {
    onChange({
      ...config,
      geminiAnalysis: {
        ...config.geminiAnalysis,
        ...updates
      }
    });
  };

  const selectedCategories = categories.filter(cat => 
    config.filters.categoryIds?.includes(cat.id)
  );

  // カテゴリーを階層順にソート（親カテゴリーの後に子カテゴリーを配置）
  const sortedCategories = [...categories].sort((a, b) => {
    // 両方ともルートカテゴリーの場合
    if (a.parent === 0 && b.parent === 0) {
      return a.name.localeCompare(b.name, 'ja');
    }
    
    // 一方がルートカテゴリーの場合
    if (a.parent === 0 && b.parent !== 0) return -1;
    if (b.parent === 0 && a.parent !== 0) return 1;
    
    // 両方とも子カテゴリーの場合
    if (a.parent !== b.parent) {
      // 親が異なる場合は親IDでソート
      return a.parent - b.parent;
    }
    
    // 同じ親を持つ場合は名前でソート
    return a.name.localeCompare(b.name, 'ja');
  });

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* フィルター設定 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              対象記事フィルター
            </Typography>
            <IconButton
              onClick={() => toggleSection('filters')}
              disabled={disabled}
            >
              {expandedSections.filters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.filters}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <FormLabel>記事ステータス</FormLabel>
                  <FormGroup row>
                    {(['publish', 'draft', 'private', 'pending', 'future'] as const).map(status => (
                      <FormControlLabel
                        key={status}
                        control={
                          <Checkbox
                            checked={config.filters.statusFilter.includes(status)}
                            onChange={(e) => {
                              const newStatuses = e.target.checked
                                ? [...config.filters.statusFilter, status]
                                : config.filters.statusFilter.filter(s => s !== status);
                              updateFilters({ statusFilter: newStatuses });
                            }}
                            disabled={disabled}
                          />
                        }
                        label={STATUS_TRANSLATIONS[status]}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={sortedCategories}
                  getOptionLabel={(option) => getCategoryHierarchicalLabel(option, categories)}
                  value={selectedCategories}
                  onChange={(_, newValue) => {
                    updateFilters({ categoryIds: newValue.map(cat => cat.id) });
                  }}
                  disabled={disabled}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        variant="outlined"
                        label={option.name}
                        {...getTagProps({ index })}
                        key={option.id}
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="カテゴリーフィルター"
                      placeholder="チェック対象のカテゴリーを選択"
                      helperText="空の場合は全カテゴリーが対象になります"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6}>
                <DatePicker
                  label="開始日"
                  value={dateRange.from}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, from: newValue }))}
                  disabled={disabled}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: "指定期間内の記事のみチェック"
                    }
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <DatePicker
                  label="終了日"
                  value={dateRange.to}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, to: newValue }))}
                  disabled={disabled}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="除外記事ID（カンマ区切り）"
                  value={config.filters.excludedPostIds?.join(', ') || ''}
                  onChange={(e) => {
                    const ids = e.target.value
                      .split(',')
                      .map(id => parseInt(id.trim()))
                      .filter(id => !isNaN(id));
                    updateFilters({ excludedPostIds: ids.length > 0 ? ids : undefined });
                  }}
                  disabled={disabled}
                  helperText="チェックから除外したい記事のIDを入力"
                />
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* スコア計算設定 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              スコア計算設定
            </Typography>
            <IconButton
              onClick={() => toggleSection('scoring')}
              disabled={disabled}
            >
              {expandedSections.scoring ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.scoring}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  品質スコア閾値: {config.scoring.scoreThreshold}点
                </Typography>
                <Slider
                  value={config.scoring.scoreThreshold}
                  onChange={(_, value) => updateScoring({ scoreThreshold: value as number })}
                  min={0}
                  max={100}
                  step={5}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' }
                  ]}
                  disabled={disabled}
                />
                <Typography variant="caption" color="text.secondary">
                  この値以下の記事が要改善として判定されます
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  重み付け設定
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="caption">
                    総合スコア = (古さ × {config.scoring.ageWeight}) + (AI文章 × {config.scoring.aiTextWeight}) + (誤情報 × {config.scoring.misinformationWeight})
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={4}>
                <Typography variant="subtitle2" gutterBottom>
                  古さの重み: {config.scoring.ageWeight}
                </Typography>
                <Slider
                  value={config.scoring.ageWeight}
                  onChange={(_, value) => updateScoring({ ageWeight: value as number })}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                />
              </Grid>

              <Grid item xs={4}>
                <Typography variant="subtitle2" gutterBottom>
                  AI文章の重み: {config.scoring.aiTextWeight}
                </Typography>
                <Slider
                  value={config.scoring.aiTextWeight}
                  onChange={(_, value) => updateScoring({ aiTextWeight: value as number })}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                />
              </Grid>

              <Grid item xs={4}>
                <Typography variant="subtitle2" gutterBottom>
                  誤情報の重み: {config.scoring.misinformationWeight}
                </Typography>
                <Slider
                  value={config.scoring.misinformationWeight}
                  onChange={(_, value) => updateScoring({ misinformationWeight: value as number })}
                  min={0}
                  max={1}
                  step={0.1}
                  disabled={disabled}
                />
              </Grid>
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* TextLint設定 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              AI文章検出設定
            </Typography>
            <IconButton
              onClick={() => toggleSection('textlint')}
              disabled={disabled}
            >
              {expandedSections.textlint ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.textlint}>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.textlintRules.aiWritingDetection}
                    onChange={(e) => updateTextlintRules({ aiWritingDetection: e.target.checked })}
                    disabled={disabled}
                  />
                }
                label="AI特有の文章パターン検出"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.textlintRules.excessiveBulletPoints}
                    onChange={(e) => updateTextlintRules({ excessiveBulletPoints: e.target.checked })}
                    disabled={disabled}
                  />
                }
                label="箇条書きの過剰使用検出"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={config.textlintRules.aiPhrasePatterns}
                    onChange={(e) => updateTextlintRules({ aiPhrasePatterns: e.target.checked })}
                    disabled={disabled}
                  />
                }
                label="AI特有のフレーズパターン検出"
              />
            </FormGroup>
          </Collapse>
        </CardContent>
      </Card>

      {/* Gemini分析設定 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              AI詳細分析設定
            </Typography>
            <IconButton
              onClick={() => toggleSection('gemini')}
              disabled={disabled}
            >
              {expandedSections.gemini ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={expandedSections.gemini}>
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  これらの機能はGemini APIを使用し、記事1件あたり約1-3円の費用がかかります
                </Typography>
              </Alert>
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.geminiAnalysis.checkMisinformation}
                      onChange={(e) => updateGeminiAnalysis({ checkMisinformation: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="誤情報・不正確な情報の検出"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.geminiAnalysis.checkRecency}
                      onChange={(e) => updateGeminiAnalysis({ checkRecency: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="情報の最新性チェック"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.geminiAnalysis.checkLogicalConsistency}
                      onChange={(e) => updateGeminiAnalysis({ checkLogicalConsistency: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="論理的整合性の確認"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.geminiAnalysis.checkSEO}
                      onChange={(e) => updateGeminiAnalysis({ checkSEO: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="SEO要素のチェック"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={config.geminiAnalysis.checkReadability}
                      onChange={(e) => updateGeminiAnalysis({ checkReadability: e.target.checked })}
                      disabled={disabled}
                    />
                  }
                  label="読みやすさの評価"
                />
              </FormGroup>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
}