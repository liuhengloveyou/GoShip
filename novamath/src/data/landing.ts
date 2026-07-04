export const navItems = [
  { label: "功能", href: "/#features" },
  { label: "使用指南", href: "/guide" },
  { label: "支持", href: "/#support" },
  { label: "隐私政策", href: "/privacy" },
] as const;

export const platforms = [
  { id: "macos", label: "macOS" },
  { id: "windows", label: "Windows" },
  { id: "linux", label: "Linux" },
] as const;

export const heroHighlights = [
  "离线识别",
  "实时渲染",
  "LaTeX 导出",
  "多平台支持",
] as const;

export const featureGroups = [
  {
    id: "editing",
    number: "01",
    title: "多种编辑模式，满足不同场景",
    description:
      "从即时 LaTeX 到专业编译引擎，再到可视化编辑，一套工具覆盖全部工作流。",
    items: [
      {
        icon: "zap" as const,
        title: "即时 LaTeX 模式",
        description: "输入 LaTeX 代码，实时渲染预览，无需等待编译。",
      },
      {
        icon: "code" as const,
        title: "标准 LaTeX 模式",
        description:
          "支持 XeLaTeX、PdfLaTeX、LuaLaTeX 等专业引擎，兼容 tikz、mhchem 等宏包。",
      },
      {
        icon: "palette" as const,
        title: "可视化编辑模式",
        description: "无需编写代码，通过界面直接编辑公式，可导出 LaTeX 与 MathML。",
      },
    ],
  },
  {
    id: "recognition",
    number: "02",
    title: "内置识别引擎",
    description: "公式与符号识别完全离线运行，保护你的数据隐私。",
    items: [
      {
        icon: "scan" as const,
        title: "公式识别",
        description: "将数学公式图片瞬间转换为 LaTeX 代码，支持批量处理与历史记录。",
      },
      {
        icon: "symbol" as const,
        title: "符号识别",
        description: "快速准确地识别单个数学符号，提升输入效率。",
      },
    ],
  },
] as const;

export const useCases = [
  {
    role: "数学专业博士生",
    quote:
      "识别速度快、准确率高，而且完全离线可用——在实验室没有网络时也能整理笔记。",
  },
  {
    role: "高校数学教师",
    quote:
      "界面简洁，批量识别多张公式图片非常高效，历史记录让我随时回顾之前的识别结果。",
  },
  {
    role: "理工科学生",
    quote:
      "可视化编辑模式对 LaTeX 新手很友好，导出 LaTeX 后排版也很整齐。",
  },
] as const;

export type FeatureIcon = "zap" | "code" | "palette" | "scan" | "symbol";
