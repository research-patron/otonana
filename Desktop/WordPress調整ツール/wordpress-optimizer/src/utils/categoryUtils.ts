import type { WordPressCategory, WordPressTag } from '../types';

// 記事ステータスの日本語翻訳
export const STATUS_TRANSLATIONS = {
  publish: '公開済み',
  draft: '下書き',
  private: '非公開',
  pending: '承認待ち',
  future: '予約投稿'
} as const;

type PostStatus = keyof typeof STATUS_TRANSLATIONS;

// 階層カテゴリーの型定義
export interface HierarchicalCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  count: number;
  children: HierarchicalCategory[];
  level: number;
}

// カテゴリーを階層構造に変換
export const buildCategoryHierarchy = (categories: WordPressCategory[]): HierarchicalCategory[] => {
  const categoryMap = new Map<number, HierarchicalCategory>();
  const rootCategories: HierarchicalCategory[] = [];

  // 最初にすべてのカテゴリーをマップに追加
  categories.forEach(cat => {
    categoryMap.set(cat.id, {
      ...cat,
      children: [],
      level: 0
    });
  });

  // 親子関係を構築
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    
    if (cat.parent === 0) {
      // ルートカテゴリー
      rootCategories.push(category);
    } else {
      // 子カテゴリー
      const parent = categoryMap.get(cat.parent);
      if (parent) {
        category.level = parent.level + 1;
        parent.children.push(category);
      } else {
        // 親が見つからない場合はルートカテゴリーとして扱う
        rootCategories.push(category);
      }
    }
  });

  // 名前でソート
  const sortCategories = (cats: HierarchicalCategory[]) => {
    cats.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    cats.forEach(cat => sortCategories(cat.children));
  };

  sortCategories(rootCategories);
  return rootCategories;
};

// カテゴリーを平坦なリストに変換（階層順序で）
export const flattenCategoryHierarchy = (categories: HierarchicalCategory[]): HierarchicalCategory[] => {
  const result: HierarchicalCategory[] = [];
  
  const addCategory = (cat: HierarchicalCategory) => {
    result.push(cat);
    cat.children.forEach(addCategory);
  };
  
  categories.forEach(addCategory);
  return result;
};

// カテゴリー検索
export const searchCategories = (
  categories: HierarchicalCategory[], 
  searchTerm: string
): HierarchicalCategory[] => {
  if (!searchTerm.trim()) return categories;
  
  const term = searchTerm.toLowerCase();
  const matches: HierarchicalCategory[] = [];
  
  const searchInCategory = (cat: HierarchicalCategory): boolean => {
    const nameMatches = cat.name.toLowerCase().includes(term);
    const childMatches = cat.children.some(searchInCategory);
    
    if (nameMatches || childMatches) {
      matches.push({
        ...cat,
        children: childMatches ? cat.children.filter(searchInCategory) : cat.children
      });
      return true;
    }
    
    return false;
  };
  
  categories.forEach(searchInCategory);
  return matches;
};

// 親カテゴリーを自動選択
export const getParentCategoryIds = (
  categoryId: number, 
  categories: WordPressCategory[]
): number[] => {
  const parentIds: number[] = [];
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  
  let currentCategory = categoryMap.get(categoryId);
  
  while (currentCategory && currentCategory.parent !== 0) {
    parentIds.unshift(currentCategory.parent);
    currentCategory = categoryMap.get(currentCategory.parent);
  }
  
  return parentIds;
};

// 選択されたカテゴリーと必要な親カテゴリーを結合
export const ensureParentCategories = (
  selectedIds: number[], 
  categories: WordPressCategory[]
): number[] => {
  const allRequiredIds = new Set<number>();
  
  selectedIds.forEach(id => {
    allRequiredIds.add(id);
    const parentIds = getParentCategoryIds(id, categories);
    parentIds.forEach(parentId => allRequiredIds.add(parentId));
  });
  
  return Array.from(allRequiredIds);
};

// タグ検索
export const searchTags = (tags: WordPressTag[], searchTerm: string): WordPressTag[] => {
  if (!searchTerm.trim()) return tags;
  
  const term = searchTerm.toLowerCase();
  return tags.filter(tag => 
    tag.name.toLowerCase().includes(term) || 
    tag.slug.toLowerCase().includes(term)
  );
};

// 名前からカテゴリーを検索
export const findCategoryByName = (
  categories: WordPressCategory[], 
  name: string
): WordPressCategory | undefined => {
  return categories.find(cat => 
    cat.name.toLowerCase() === name.toLowerCase() ||
    cat.slug.toLowerCase() === name.toLowerCase()
  );
};

// 名前からタグを検索
export const findTagByName = (
  tags: WordPressTag[], 
  name: string
): WordPressTag | undefined => {
  return tags.find(tag => 
    tag.name.toLowerCase() === name.toLowerCase() ||
    tag.slug.toLowerCase() === name.toLowerCase()
  );
};

// カテゴリー表示名（階層表示用）
export const getCategoryDisplayName = (category: HierarchicalCategory): string => {
  const indent = '  '.repeat(category.level);
  const prefix = category.level > 0 ? '└ ' : '';
  return `${indent}${prefix}${category.name}`;
};

// カテゴリーの階層表示用ラベルを取得
export const getCategoryHierarchicalLabel = (category: WordPressCategory, allCategories: WordPressCategory[]): string => {
  const path: string[] = [];
  let currentCategory = category;

  // 階層パスを構築（ルートから子まで）
  while (currentCategory) {
    path.unshift(currentCategory.name);
    if (currentCategory.parent === 0) break;
    
    const parent = allCategories.find(cat => cat.id === currentCategory.parent);
    if (!parent) break;
    currentCategory = parent;
  }

  // パス形式で表示（例：親カテゴリー > 子カテゴリー）
  if (path.length === 1) {
    return path[0]; // ルートカテゴリー
  } else {
    return path.join(' > '); // 階層パス表示
  }
};

// カテゴリー階層のバリデーション
export const validateCategoryHierarchy = (categories: WordPressCategory[]): string[] => {
  const errors: string[] = [];
  const categoryIds = new Set(categories.map(cat => cat.id));
  
  categories.forEach(cat => {
    if (cat.parent !== 0 && !categoryIds.has(cat.parent)) {
      errors.push(`カテゴリー "${cat.name}" の親カテゴリー (ID: ${cat.parent}) が見つかりません`);
    }
  });
  
  return errors;
};