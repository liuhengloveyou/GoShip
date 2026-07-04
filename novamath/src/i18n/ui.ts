const defaultLocale = "zh-cn";

const messages = {
  "zh-cn": {
    navPosts: "文章",
    navTags: "标签",
    navAbout: "关于",
    navArchives: "归档",
    navSearch: "搜索",
    navOverview: "总览",
    navTitle: "导航",
    skipToContent: "跳转到正文",
    openMenu: "打开菜单",
    openNavigation: "打开导航",
    readPosts: "阅读文章",
    aboutSite: "关于本站",
    featured: "精选",
    recentPosts: "最新文章",
    viewAll: "查看全部",
    siteIntro: "一个采用 Astro 与 daisyUI 打造的简洁文档风博客体验。",
    posts: "文章",
    tags: "标签",
    archives: "归档",
    search: "搜索",
    postsDesc: "这里是全部文章列表。",
    tagsDesc: "这里是全部标签。",
    archivesDesc: "这里是全部归档文章。",
    searchDesc: "搜索任意文章内容...",
    previousPost: "上一篇",
    nextPost: "下一篇",
    paginationNav: "分页导航",
    gotoPrevPage: "前往上一页",
    gotoNextPage: "前往下一页",
    prev: "上一页",
    next: "下一页",
    allRightsReserved: "版权所有",
    copyright: "版权",
    goBack: "返回",
    home: "首页",
    page: "第 {n} 页",
    editPage: "编辑页面",
    updated: "更新于",
    tag: "标签",
    tagArticles: "带有标签 “{tag}” 的全部文章。",
    devWarningTitle: "开发模式提示",
    devWarningBody: "开发环境下需至少构建一次，搜索结果才会显示。",
    copy: "复制",
    copied: "已复制",
  },
  en: {
    navPosts: "Posts",
    navTags: "Tags",
    navAbout: "About",
    navArchives: "Archives",
    navSearch: "Search",
    navOverview: "Overview",
    navTitle: "Navigation",
    skipToContent: "Skip to content",
    openMenu: "Open Menu",
    openNavigation: "Open navigation",
    readPosts: "Read Posts",
    aboutSite: "About this site",
    featured: "Featured",
    recentPosts: "Recent Posts",
    viewAll: "View all",
    siteIntro: "A clean blog experience styled like a docs site with Astro and daisyUI.",
    posts: "Posts",
    tags: "Tags",
    archives: "Archives",
    search: "Search",
    postsDesc: "All the articles I've posted.",
    tagsDesc: "All the tags used in posts.",
    archivesDesc: "All the articles I've archived.",
    searchDesc: "Search any article ...",
    previousPost: "Previous Post",
    nextPost: "Next Post",
    paginationNav: "Pagination Navigation",
    gotoPrevPage: "Goto Previous Page",
    gotoNextPage: "Goto Next Page",
    prev: "Prev",
    next: "Next",
    allRightsReserved: "All rights reserved.",
    copyright: "Copyright",
    goBack: "Go back",
    home: "Home",
    page: "Page {n}",
    editPage: "Edit page",
    updated: "Updated:",
    tag: "Tag",
    tagArticles: 'All the articles with the tag "{tag}".',
    devWarningTitle: "DEV mode Warning",
    devWarningBody:
      "You need to build the project at least once to see the search results during development.",
    copy: "Copy",
    copied: "Copied",
  },
} as const;

export type UiKey = keyof (typeof messages)["zh-cn"];
export type LocaleCode = keyof typeof messages;

export function normalizeLocale(locale?: string): LocaleCode {
  if (!locale) return defaultLocale;
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("zh")) return "zh-cn";
  if (normalized.startsWith("en")) return "en";
  return defaultLocale;
}

export function t(locale: string | undefined, key: UiKey): string {
  const current = messages[normalizeLocale(locale)];
  return current[key];
}

export function formatPage(locale: string | undefined, pageNumber: number): string {
  const template = t(locale, "page");
  return template.replace("{n}", String(pageNumber));
}
