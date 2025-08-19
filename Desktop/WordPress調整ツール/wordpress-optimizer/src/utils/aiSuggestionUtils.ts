import type { AISuggestion, WordPressCategory, WordPressTag, WordPressSite } from '../types';
import { createCategory, createTag } from '../services/wordpress';
import { findCategoryByName, findTagByName } from './categoryUtils';

// AI提案のカテゴリー・タグを実際のIDに変換する結果
export interface ResolvedSuggestion {
  existingCategoryIds: number[];
  existingTagIds: number[];
  newlyCreatedCategories: WordPressCategory[];
  newlyCreatedTags: WordPressTag[];
  allCategoryIds: number[];
  allTagIds: number[];
}

// AI提案のカテゴリー・タグ名を実際のIDに変換・作成
export const resolveAISuggestionCategories = async (
  suggestion: AISuggestion,
  existingCategories: WordPressCategory[],
  existingTags: WordPressTag[],
  site: WordPressSite,
  options: {
    createNewCategories?: boolean;
    createNewTags?: boolean;
    maxNewCategories?: number;
    maxNewTags?: number;
  } = {}
): Promise<ResolvedSuggestion> => {
  const {
    createNewCategories = true,
    createNewTags = true,
    maxNewCategories = 5,
    maxNewTags = 10,
  } = options;

  const result: ResolvedSuggestion = {
    existingCategoryIds: [],
    existingTagIds: [],
    newlyCreatedCategories: [],
    newlyCreatedTags: [],
    allCategoryIds: [],
    allTagIds: [],
  };

  // 既存のカテゴリーIDを追加
  result.existingCategoryIds = [...(suggestion.categories?.existing || [])];

  // 既存のタグIDを追加
  result.existingTagIds = [...(suggestion.tags?.existing || [])];

  // 新規カテゴリーの処理
  if (createNewCategories && suggestion.categories?.new) {
    const newCategoryNames = suggestion.categories.new
      .slice(0, maxNewCategories) // 制限を適用
      .filter(name => name.trim().length > 0);

    for (const categoryName of newCategoryNames) {
      try {
        // 既存のカテゴリーをチェック
        const existingCategory = findCategoryByName(existingCategories, categoryName);
        
        if (existingCategory) {
          // 既存のカテゴリーがあればIDを追加
          if (!result.existingCategoryIds.includes(existingCategory.id)) {
            result.existingCategoryIds.push(existingCategory.id);
          }
        } else {
          // 新規作成
          console.log(`Creating new category: ${categoryName}`);
          const newCategory = await createCategory(site, {
            name: categoryName.trim(),
            description: `AI提案により自動作成されたカテゴリー: ${categoryName}`,
          });
          
          result.newlyCreatedCategories.push(newCategory);
          
          // 既存リストにも追加（後続の処理で使用するため）
          existingCategories.push(newCategory);
        }
      } catch (error) {
        console.error(`Failed to create category "${categoryName}":`, error);
        // エラーが発生しても処理を続行
      }
    }
  }

  // 新規タグの処理
  if (createNewTags && suggestion.tags?.new) {
    const newTagNames = suggestion.tags.new
      .slice(0, maxNewTags) // 制限を適用
      .filter(name => name.trim().length > 0);

    for (const tagName of newTagNames) {
      try {
        // 既存のタグをチェック
        const existingTag = findTagByName(existingTags, tagName);
        
        if (existingTag) {
          // 既存のタグがあればIDを追加
          if (!result.existingTagIds.includes(existingTag.id)) {
            result.existingTagIds.push(existingTag.id);
          }
        } else {
          // 新規作成
          console.log(`Creating new tag: ${tagName}`);
          const newTag = await createTag(site, {
            name: tagName.trim(),
            description: `AI提案により自動作成されたタグ: ${tagName}`,
          });
          
          result.newlyCreatedTags.push(newTag);
          
          // 既存リストにも追加（後続の処理で使用するため）
          existingTags.push(newTag);
        }
      } catch (error) {
        console.error(`Failed to create tag "${tagName}":`, error);
        // エラーが発生しても処理を続行
      }
    }
  }

  // 全IDをまとめる
  result.allCategoryIds = [
    ...result.existingCategoryIds,
    ...result.newlyCreatedCategories.map(cat => cat.id),
  ];

  result.allTagIds = [
    ...result.existingTagIds,
    ...result.newlyCreatedTags.map(tag => tag.id),
  ];

  return result;
};

// AI提案からカテゴリー・タグの説明文を生成
export const generateCategoryDescription = (categoryName: string, suggestion?: AISuggestion): string => {
  if (!suggestion) {
    return `AI提案により自動作成されたカテゴリー: ${categoryName}`;
  }

  // タイトルや記事内容から関連性を推測
  const titles = suggestion.titles || [];
  const mainTitle = titles[0] || '';
  
  if (mainTitle) {
    return `「${mainTitle}」関連記事用のカテゴリー (AI自動作成)`;
  }

  return `AI提案により自動作成されたカテゴリー: ${categoryName}`;
};

export const generateTagDescription = (tagName: string, suggestion?: AISuggestion): string => {
  if (!suggestion) {
    return `AI提案により自動作成されたタグ: ${tagName}`;
  }

  // タイトルや記事内容から関連性を推測
  const titles = suggestion.titles || [];
  const mainTitle = titles[0] || '';
  
  if (mainTitle) {
    return `「${mainTitle}」関連記事用のタグ (AI自動作成)`;
  }

  return `AI提案により自動作成されたタグ: ${tagName}`;
};

// 重複するカテゴリー・タグ名をチェック
export const validateNewCategoriesAndTags = (
  suggestion: AISuggestion,
  existingCategories: WordPressCategory[],
  existingTags: WordPressTag[]
): {
  duplicateCategories: string[];
  duplicateTags: string[];
  validNewCategories: string[];
  validNewTags: string[];
} => {
  const duplicateCategories: string[] = [];
  const duplicateTags: string[] = [];
  const validNewCategories: string[] = [];
  const validNewTags: string[] = [];

  // カテゴリーのチェック
  (suggestion.categories?.new || []).forEach(categoryName => {
    const trimmedName = categoryName.trim();
    if (trimmedName.length === 0) return;

    if (findCategoryByName(existingCategories, trimmedName)) {
      duplicateCategories.push(trimmedName);
    } else {
      validNewCategories.push(trimmedName);
    }
  });

  // タグのチェック
  (suggestion.tags?.new || []).forEach(tagName => {
    const trimmedName = tagName.trim();
    if (trimmedName.length === 0) return;

    if (findTagByName(existingTags, trimmedName)) {
      duplicateTags.push(trimmedName);
    } else {
      validNewTags.push(trimmedName);
    }
  });

  return {
    duplicateCategories,
    duplicateTags,
    validNewCategories,
    validNewTags,
  };
};

// カテゴリー・タグ作成の進捗情報
export interface CreationProgress {
  total: number;
  completed: number;
  current: string;
  errors: Array<{
    type: 'category' | 'tag';
    name: string;
    error: string;
  }>;
}

// カテゴリー・タグ作成の進捗コールバック付きバージョン
export const resolveAISuggestionWithProgress = async (
  suggestion: AISuggestion,
  existingCategories: WordPressCategory[],
  existingTags: WordPressTag[],
  site: WordPressSite,
  onProgress?: (progress: CreationProgress) => void,
  options: {
    createNewCategories?: boolean;
    createNewTags?: boolean;
    maxNewCategories?: number;
    maxNewTags?: number;
  } = {}
): Promise<ResolvedSuggestion> => {
  const {
    createNewCategories = true,
    createNewTags = true,
    maxNewCategories = 5,
    maxNewTags = 10,
  } = options;

  const newCategoryNames = createNewCategories 
    ? (suggestion.categories?.new || []).slice(0, maxNewCategories).filter(name => name.trim().length > 0)
    : [];
  
  const newTagNames = createNewTags 
    ? (suggestion.tags?.new || []).slice(0, maxNewTags).filter(name => name.trim().length > 0)
    : [];

  const total = newCategoryNames.length + newTagNames.length;
  let completed = 0;
  const errors: CreationProgress['errors'] = [];

  const updateProgress = (current: string) => {
    if (onProgress) {
      onProgress({
        total,
        completed,
        current,
        errors: [...errors],
      });
    }
  };

  const result: ResolvedSuggestion = {
    existingCategoryIds: [...(suggestion.categories?.existing || [])],
    existingTagIds: [...(suggestion.tags?.existing || [])],
    newlyCreatedCategories: [],
    newlyCreatedTags: [],
    allCategoryIds: [],
    allTagIds: [],
  };

  // カテゴリー作成
  for (const categoryName of newCategoryNames) {
    updateProgress(`カテゴリー作成中: ${categoryName}`);
    
    try {
      const existingCategory = findCategoryByName(existingCategories, categoryName);
      
      if (existingCategory) {
        if (!result.existingCategoryIds.includes(existingCategory.id)) {
          result.existingCategoryIds.push(existingCategory.id);
        }
      } else {
        const newCategory = await createCategory(site, {
          name: categoryName.trim(),
          description: generateCategoryDescription(categoryName, suggestion),
        });
        
        result.newlyCreatedCategories.push(newCategory);
        existingCategories.push(newCategory);
      }
    } catch (error) {
      errors.push({
        type: 'category',
        name: categoryName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    completed++;
  }

  // タグ作成
  for (const tagName of newTagNames) {
    updateProgress(`タグ作成中: ${tagName}`);
    
    try {
      const existingTag = findTagByName(existingTags, tagName);
      
      if (existingTag) {
        if (!result.existingTagIds.includes(existingTag.id)) {
          result.existingTagIds.push(existingTag.id);
        }
      } else {
        const newTag = await createTag(site, {
          name: tagName.trim(),
          description: generateTagDescription(tagName, suggestion),
        });
        
        result.newlyCreatedTags.push(newTag);
        existingTags.push(newTag);
      }
    } catch (error) {
      errors.push({
        type: 'tag',
        name: tagName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    
    completed++;
  }

  // 完了通知
  updateProgress('完了');

  // 全IDをまとめる
  result.allCategoryIds = [
    ...result.existingCategoryIds,
    ...result.newlyCreatedCategories.map(cat => cat.id),
  ];

  result.allTagIds = [
    ...result.existingTagIds,
    ...result.newlyCreatedTags.map(tag => tag.id),
  ];

  return result;
};