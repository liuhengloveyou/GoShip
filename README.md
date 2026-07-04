# GoPress 最佳落地方案（V1）

## 1. 方案目标

本项目目标不是搭一个“能写文章”的后台，而是建设一套长期可运营的内容平台：

- 编辑体验强（TipTap 级别）
- 数据模型规范（状态机、SEO、版本、资产）
- 发布流程可控（手动发布，不自动构建）
- 前台稳定高性能（Astro 静态站）
- 架构可演进（数据源可切换、接口不绑死 SDK）

一句话：

> 当前主线为 GoPress 自建 Go 后端 + Astro；`PocketBase/` 目录仅作参考实现。

---

## 2. 核心原则

### 2.1 不直接在页面层使用 PB SDK

前端页面、路由、组件不得直接依赖 PocketBase SDK。  
统一通过内容层接口访问数据，确保后续可替换数据源。

### 2.2 发布必须人工确认

不采用“状态变更自动构建”。  
后台提供明确的 `发布` 按钮（可二次确认），由用户主动触发发布流水线。

### 2.3 状态机先行

文章不是 `draft/published` 二元模型，而是完整状态机：

- `draft`
- `in_review`
- `scheduled`
- `published`
- `archived`

### 2.4 SEO 字段是模型基础设施

SEO 字段必须内建在内容模型中，不能作为页面层临时拼接逻辑。

### 2.5 预览链路与正式发布链路隔离

草稿预览必须使用签名 URL + 短时令牌，不得污染正式发布站点。

---

## 3. 总体架构

```text
编辑端（自定义后台 + TipTap）
        ↓
内容服务层（统一接口，不暴露 PB SDK）
        ↓
PocketBase（Auth / API / Files / SQLite）
        ↓
发布服务（人工点击发布后触发）
        ↓
Astro Build（读取内容层）
        ↓
dist/ + Nginx
```

### 3.1 分层职责

- 编辑端：编辑、自动保存、媒体上传、预览、发布操作
- 内容服务层：领域规则、状态校验、SEO 校验、发布流程编排
- PocketBase：持久化、权限、文件、基础查询
- 发布服务：构建任务编排、日志、并发控制、回滚
- Astro：静态渲染、SEO 输出、站点发布产物

---

## 4. 内容模型设计（强约束）

## 4.1 `posts` 核心字段

- `id`
- `title`
- `slug`（唯一）
- `excerpt`
- `content_json`（TipTap 原始结构）
- `content_html`（渲染结果）
- `status`（状态机）
- `tags`
- `category`
- `cover_asset_id`
- `author_id`
- `published_at`
- `scheduled_at`
- `created`
- `updated`

### 4.2 SEO 字段（前置）

- `seo_title`
- `seo_description`
- `seo_keywords`
- `seo_image_asset_id`
- `canonical_url`
- `robots_noindex`
- `robots_nofollow`

### 4.3 发布控制字段

- `last_release_id`
- `last_release_at`
- `release_note`
- `content_hash`（用于判断是否需要发布）

### 4.4 版本字段（建议）

- `version`
- `parent_version_id`
- `change_summary`

---

## 5. 资产治理（媒体库）

新增 `assets` 集合，作为统一媒体中心，而不是“仅文件上传”：

- `id`
- `file`
- `mime_type`
- `size`
- `width` / `height`
- `sha256`
- `owner_id`
- `usage_count`
- `status`（`active` / `orphaned` / `deleted`）
- `created` / `updated`

治理规则：

- 上传后生成多尺寸（如 `sm/md/lg`）与 WebP/AVIF
- 文章保存时回写资产引用关系
- 定期扫描未引用资源并标记 `orphaned`
- 延迟物理删除，支持恢复窗口

---

## 6. 编辑器方案（TipTap）

### 6.1 基础能力

- 标题、列表、引用、代码块、表格、图片、链接
- Slash Command
- 快捷键与粘贴清洗
- 自动保存（防抖）

### 6.2 发布前校验

发布按钮点击时，统一执行：

- 必填项校验（title/slug/description）
- SEO 字段长度与重复性校验
- 封面图与 OG 图存在性校验
- 链接可用性基础校验（可异步）
- 状态机合法性校验

校验失败不允许进入发布。

---

## 7. 内容层接口（唯一数据入口）

建议目录：

```text
site/src/lib/content/
  domain.ts
  service.ts
  repositories/
    post-repo.ts
    asset-repo.ts
  sources/
    pb-source.ts
    local-source.ts
```

对 Astro 和后台暴露的接口（示例）：

- `getPosts(query)`
- `getPostBySlug(slug, options)`
- `saveDraft(input)`
- `requestReview(postId)`
- `schedulePost(postId, datetime)`
- `publishPost(postId, releaseNote)`
- `archivePost(postId)`
- `generatePreviewToken(postId)`
- `getPreviewPostByToken(token)`

说明：

- 页面层永远只调用 `service`，不直接调用 PB SDK。
- `source` 可切换：`CONTENT_SOURCE=pb/local`。

---

## 8. 发布流程（手动触发）

## 8.1 标准流程

1. 编辑者在后台点击 `发布`
2. 系统执行发布前校验
3. 校验通过后创建 `release` 记录（状态 `queued`）
4. 发布服务拉取任务并执行构建
5. 构建成功后原子切换站点目录
6. 更新 `release` 状态为 `success` 并记录版本信息

### 8.2 关键要求

- 单站点同一时刻只允许一个发布任务
- 同 `content_hash` 禁止重复发布（幂等）
- 发布失败不影响线上旧版本
- 提供一键回滚到最近成功版本

---

## 9. 预览链路（独立于发布）

### 9.1 机制

- 生成短时签名 token（如 15 分钟）
- 预览地址示例：`/preview/:token`
- token 绑定 `post_id + version + expire_at + signer`

### 9.2 安全要求

- 预览页返回 `X-Robots-Tag: noindex, nofollow`
- 禁止预览链接被 sitemap/导航收录
- token 过期和撤销机制必须可用

---

## 10. Astro 站点策略

- 页面渲染只消费内容层 DTO，不感知 PB 字段细节
- `sitemap`、`robots`、`canonical` 均基于 SEO 字段输出
- 列表/详情/标签页统一走内容服务接口
- 构建产物发布到固定目录（Nginx `root` 对齐）

---

## 11. 可观测性与运维

### 11.1 必备日志

- 编辑保存日志
- 发布任务日志（开始/结束/耗时/结果）
- 构建失败栈与上下文参数
- 回滚操作日志

### 11.2 指标建议

- 发布成功率
- 平均构建时长
- 失败原因分布
- 文章从创建到发布的周期

### 11.3 告警建议

- 发布失败即时告警（飞书/企业微信/邮件）
- 连续失败阈值告警
- 构建耗时异常告警

---

## 12. 实施路线（按“最好方案”）

### 阶段 A：领域基础（必须）

- 完成 `posts/assets/releases` 数据模型
- 建立状态机与发布校验规则
- 建立内容服务层，禁止页面直连 PB SDK

### 阶段 B：编辑与预览（必须）

- 接入 TipTap 与自动保存
- 完成资产上传、引用追踪与回收标记
- 落地签名预览链路

### 阶段 C：发布与运维（必须）

- 发布按钮触发 `release` 任务
- 构建服务执行 Astro build + 原子切换
- 发布日志、失败告警、回滚能力上线

### 阶段 D：质量增强（推荐）

- 版本对比与变更摘要
- 定时发布
- 增量构建优化
- SEO 质量评分与编辑端提示

---

## 13. 最终结论

本项目的最佳落地方案是：

1. 保留 PocketBase 作为后端能力层，但不把它暴露到页面层
2. 采用 TipTap 自定义编辑端，替代默认富文本体验
3. 构建统一内容服务层，作为唯一数据入口
4. 使用细化状态机管理内容全生命周期
5. SEO 字段前置进模型，发布前强校验
6. 资产治理体系化（多规格、引用追踪、回收）
7. 预览链路独立、可控、安全
8. 发布由人工点击触发，不自动构建
9. 发布链路具备并发控制、幂等、回滚和告警

一句话落地版：

> 这是“可运营、可治理、可演进”的内容平台方案，不是模板拼装方案。

---

## 14. 发布上线步骤（当前实现）

本项目当前采用「本地编译 + rsync 发布运行文件 + systemd 托管 + nginx 转发」。

### 14.1 服务器准备

1. 创建线上目录：

```bash
mkdir -p /opt/gopress
```

2. 准备环境文件：

```bash
cp /opt/gopress/configs/web.example.env /opt/gopress/configs/web.env
```

3. 编辑 `/opt/gopress/configs/web.env`，至少确认：

- `APP_PORT`（例如 `10001`）
- `APP_DB_FILE`（例如 `./data/gopress.db`）
- `SITE_DIR`（默认 `./site`）
- `SITE_BUILD_TOKEN`（如启用接口鉴权）

> 注意：`web.example.env` 只是示例，程序不会自动读取；systemd 读取的是 `web.env`。

### 14.2 本地一键发布

在本地项目根目录执行：

```bash
./scripts/publish.sh
```

脚本会：

1. 编译 Linux AMD64 二进制（`gopress`）
2. 用一条 rsync 同步运行必需文件到服务器 `/opt/gopress`
   - `gopress`
   - `configs/`
   - `site/dist/`
3. 可选触发 `POST /api/v1/site/build`（默认关闭）

如需发布后自动触发构建：

```bash
TRIGGER_BUILD_AFTER_DEPLOY=1 API_BASE_URL=http://<server>:<port> ./scripts/publish.sh
```

### 14.3 配置 systemd

使用仓库内模板：

- `configs/systemd/gopress.service`

服务器上执行：

```bash
cp /opt/gopress/configs/systemd/gopress.service /etc/systemd/system/gopress.service
systemctl daemon-reload
systemctl enable gopress
systemctl restart gopress
```

查看状态和日志：

```bash
systemctl status gopress
journalctl -u gopress -f
```

### 14.4 配置 nginx

使用仓库内模板：

- `configs/nginx/gopress.conf`

关键路由：

- `/`：站点静态内容（`site/dist`）
- `/_admin/`：后台管理（反代 GoPress）
- `/api/`：接口（反代 GoPress）

应用配置：

```bash
cp /opt/gopress/configs/nginx/gopress.conf /etc/nginx/conf.d/gopress.conf
nginx -t && systemctl reload nginx
```

### 14.5 常见问题

- **改了 `web.example.env` 但端口不生效**
  - 原因：程序不自动读取 example 文件，需改 `web.env` 或显式导出环境变量。
- **`bind: address already in use`**
  - 原因：端口被占用，换端口或停掉占用进程。
- **发布后看不到新文章**
  - 原因：站点内容来自导出的 `site/src/data/blog/*.md`，需触发构建让导出和静态构建生效。
