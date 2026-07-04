# DOMIAI Site（Astro）

本项目是基于 Astro 的静态站点（Site），使用 Tailwind CSS + daisyUI，支持中文/英文 i18n，并在构建时自动生成 sitemap。

## 本地开发

```bash
pnpm install
pnpm dev
```

默认访问：`http://localhost:4321`

常用命令：

```bash
pnpm build    # astro check + astro build + pagefind
pnpm preview  # 本地预览 dist
pnpm lint
```

## 内容源配置

站点现在支持两种内容源：

- `CONTENT_SOURCE=local`：继续读取 `src/data/blog/*.md`
- `CONTENT_SOURCE=pb`：构建时从 PocketBase API 读取已发布文章

可复制 `site/.env.example` 作为本地环境配置参考。

当使用 PocketBase 内容源时，需要至少配置：

```bash
CONTENT_SOURCE=pb
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_POSTS_COLLECTION=posts
```

当前 PocketBase 读取适配默认面向公开站点构建场景：

- 只读取 `status='published'` 的文章
- 正文优先读取 `content_html`
- 摘要优先读取 `excerpt`
- 封面文件会映射成可直接访问的文件 URL

## 项目结构（关键目录）

- `src/`：页面、布局、组件、样式
- `public/`：静态资源（构建时拷贝到站点根）
- `deploy/nginx.domiai.conf`：Nginx 部署模板（静态站 + /admin /api 反代）
- `pub.sh`：一键发布脚本（本地构建后 rsync `dist/` 到远端）

## SEO 与 Sitemap（纯自动）

- 已启用 `@astrojs/sitemap`
- 构建后自动生成 `dist/sitemap-index.xml`（及分片 sitemap）
- `robots.txt` 由 `src/pages/robots.txt.ts` 动态生成，并自动指向 `sitemap-index.xml`
- 不需要手写 `public/sitemap.xml` / `public/robots.txt`

## 部署说明（Nginx + VPS）

### 1）服务器前置环境

服务器需安装：

- Nginx
- rsync（`pub.sh` 需要本机和远端都可用）
- SSH（用于远程同步）

说明：该站点为静态部署，服务器不需要 Node.js 常驻运行站点服务。

### 2）本地构建并发布

在项目根目录执行（参数可省略，省略时使用 `pub.sh` 默认值）：

```bash
./pub.sh [user@host] [remote_dir]
```

示例：

```bash
./pub.sh root@1.2.3.4 /opt/domiai/site/dist
```

脚本会执行：

1. 本地 `pnpm install --frozen-lockfile`
2. 本地 `pnpm build`
3. 远端创建目录
4. `rsync --delete` 同步 `dist/` 内容到远端目录

### 3）配置 Nginx

将 `deploy/nginx.domiai.conf` 安装到服务器后，按需修改：

- `server_name`：你的域名
- `root`：静态站点目录（应与 `pub.sh` 的 `remote_dir` 一致）
- `/admin/` 与 `/api/` 的 `proxy_pass` 上游地址
- `ssl_certificate` / `ssl_certificate_key`（启用 HTTPS 时）

常用命令：

```bash
sudo install -m 644 deploy/nginx.domiai.conf /etc/nginx/conf.d/domiai.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 4）发布后检查

```bash
curl -I https://your-domain.com
curl -I https://your-domain.com/robots.txt
curl -I https://your-domain.com/sitemap-index.xml
```

建议确认：

- 首页返回 `200`
- `robots.txt` 可访问，且 `Sitemap` 指向 `.../sitemap-index.xml`
- `sitemap-index.xml` 可访问
