export const SITE = {
  website: "https://dimiai.cn/",
  author: "DIMIAI",
  profile: "https://dimiai.cn/",
  desc: "DIMIAI 技术博客，聚焦 AI、工程实践与产品落地。",
  title: "DIMIAI",
  ogImage: "og.png",
  lightAndDarkMode: true,
  postPerIndex: 4,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: false,
    text: "反馈问题",
    url: "https://dimiai.cn/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-CN", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Shanghai", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
