import {
    completeRelease,
    createDraft,
    createRelease,
    failRelease,
    getPostById,
    listPosts,
    publishPost,
    updatePost,
} from "./postService";

export function pagePostEditor() {
    app.store.title = "Post Editor";

    const pageData = store({
        posts: [],
        isLoading: false,
        isSaving: false,
        isPublishing: false,
        activePostId: "",
        title: "",
        slug: "",
        excerpt: "",
        contentHtml: "",
        seoTitle: "",
        seoDescription: "",
        status: "draft",
        releaseNote: "",
        validationErrors: [],
        lastPublishedAt: "",
    });

    function resetForm() {
        pageData.activePostId = "";
        pageData.title = "";
        pageData.slug = "";
        pageData.excerpt = "";
        pageData.contentHtml = "";
        pageData.seoTitle = "";
        pageData.seoDescription = "";
        pageData.status = "draft";
        pageData.releaseNote = "";
        pageData.validationErrors = [];
        pageData.lastPublishedAt = "";
    }

    async function loadPosts() {
        pageData.isLoading = true;
        try {
            const result = await listPosts();
            pageData.posts = result.items || [];
        } catch (err) {
            app.checkApiError(err);
        }
        pageData.isLoading = false;
    }

    async function loadPost(id) {
        if (!id) {
            return;
        }
        try {
            const post = await getPostById(id);
            pageData.activePostId = post.id;
            pageData.title = post.title || "";
            pageData.slug = post.slug || "";
            pageData.excerpt = post.excerpt || "";
            pageData.contentHtml = post.content_html || "";
            pageData.seoTitle = post.seo_title || "";
            pageData.seoDescription = post.seo_description || "";
            pageData.status = post.status || "draft";
            pageData.releaseNote = post.release_note || "";
            pageData.lastPublishedAt = post.published_at || "";
            pageData.validationErrors = [];
        } catch (err) {
            app.checkApiError(err);
        }
    }

    function buildPayload() {
        return {
            title: pageData.title.trim(),
            slug: pageData.slug.trim(),
            excerpt: pageData.excerpt.trim(),
            content_html: pageData.contentHtml,
            seo_title: pageData.seoTitle.trim(),
            seo_description: pageData.seoDescription.trim(),
            status: pageData.status,
            release_note: pageData.releaseNote.trim(),
        };
    }

    function getBaseValidationErrors() {
        const errors = [];

        if (!pageData.title.trim()) {
            errors.push("标题不能为空。");
        }
        if (!pageData.slug.trim()) {
            errors.push("Slug 不能为空。");
        }
        if (!pageData.excerpt.trim()) {
            errors.push("摘要不能为空。");
        }

        return errors;
    }

    function getPublishValidationErrors() {
        const errors = getBaseValidationErrors();

        if (!pageData.contentHtml.trim()) {
            errors.push("正文不能为空，不能发布空文章。");
        }
        if (!pageData.seoTitle.trim()) {
            errors.push("发布前必须填写 SEO Title。");
        }
        if (!pageData.seoDescription.trim()) {
            errors.push("发布前必须填写 SEO Description。");
        }
        if (pageData.seoDescription.trim().length > 160) {
            errors.push("SEO Description 建议不超过 160 字符。");
        }

        return errors;
    }

    function canSetStatus(currentStatus, nextStatus) {
        const transitionMap = {
            draft: ["draft", "in_review", "scheduled", "published", "archived"],
            in_review: ["in_review", "draft", "scheduled", "published", "archived"],
            scheduled: ["scheduled", "draft", "published", "archived"],
            published: ["published", "archived", "draft"],
            archived: ["archived", "draft"],
        };

        const allowed = transitionMap[currentStatus] || ["draft"];
        return allowed.includes(nextStatus);
    }

    function ensureStatusTransition(nextStatus) {
        const currentPost = pageData.posts.find((item) => item.id == pageData.activePostId);
        const currentStatus = currentPost?.status || "draft";
        if (!canSetStatus(currentStatus, nextStatus)) {
            throw new Error(`状态流转不合法：${currentStatus} -> ${nextStatus}`);
        }
    }

    async function saveDraftAction() {
        if (pageData.isSaving || pageData.isPublishing) {
            return;
        }

        pageData.isSaving = true;
        try {
            const validationErrors = getBaseValidationErrors();
            pageData.validationErrors = validationErrors;
            if (validationErrors.length) {
                throw new Error("请先修复校验问题再保存。");
            }

            ensureStatusTransition("draft");
            const payload = buildPayload();
            let post;
            if (!pageData.activePostId) {
                post = await createDraft(payload);
                pageData.activePostId = post.id;
            } else {
                post = await updatePost(pageData.activePostId, {
                    ...payload,
                    status: "draft",
                });
            }
            app.toasts.success("Draft saved.");
            await loadPosts();
            await loadPost(post.id);
        } catch (err) {
            app.checkApiError(err);
        }
        pageData.isSaving = false;
    }

    async function publishAction() {
        if (pageData.isPublishing || pageData.isSaving) {
            return;
        }
        try {
            const validationErrors = getPublishValidationErrors();
            pageData.validationErrors = validationErrors;
            if (validationErrors.length) {
                throw new Error("发布校验未通过，请先修复问题。");
            }

            const payload = buildPayload();
            let postId = pageData.activePostId;

            if (!postId) {
                const created = await createDraft(payload);
                postId = created.id;
                pageData.activePostId = created.id;
            }

            const doPublish = async () => {
                let release = null;
                pageData.isPublishing = true;
                try {
                    ensureStatusTransition("published");
                    const updated = await publishPost(postId, payload);
                    release = await createRelease(updated.id, pageData.releaseNote || "manual publish");
                    await completeRelease(release.id);

                    app.toasts.success("文章发布成功。");
                    await loadPosts();
                    await loadPost(updated.id);
                } catch (err) {
                    if (release?.id) {
                        await failRelease(release.id, err?.message || "publish failed");
                    }
                    throw err;
                } finally {
                    pageData.isPublishing = false;
                }
            };

            app.modals.confirm(
                "确认发布这篇文章？发布将写入 release 记录并更新线上状态。",
                doPublish,
                null,
                {
                    yesButton: "确认发布",
                    noButton: "取消",
                },
            );
        } catch (err) {
            app.checkApiError(err);
        }
    }

    function postTitle(post) {
        return post?.title || "Untitled";
    }

    return t.div(
        {
            className: "page",
            pbEvent: "pagePostEditor",
            onmount: () => loadPosts(),
        },
        t.div(
            { className: "page-content full-height" },
            t.header(
                { className: "page-header compact" },
                t.nav(
                    { className: "breadcrumbs" },
                    t.div({ className: "breadcrumb-item" }, "CMS"),
                    t.div({ className: "breadcrumb-item" }, "Post Editor"),
                ),
                t.div({ className: "m-l-auto" }),
                t.button(
                    {
                        type: "button",
                        className: "btn transparent secondary",
                        onclick: () => resetForm(),
                    },
                    t.span({ className: "txt" }, "New Draft"),
                ),
                t.button(
                    {
                        type: "button",
                        className: () => `btn ${pageData.isSaving ? "loading" : ""}`,
                        disabled: () => pageData.isSaving || pageData.isPublishing,
                        onclick: () => saveDraftAction(),
                    },
                    t.span({ className: "txt" }, "Save Draft"),
                ),
                t.button(
                    {
                        type: "button",
                        className: () => `btn success ${pageData.isPublishing ? "loading" : ""}`,
                        disabled: () => pageData.isPublishing || pageData.isSaving,
                        onclick: () => publishAction(),
                    },
                    t.span({ className: "txt" }, "Publish"),
                ),
            ),
            t.div(
                { className: "wrapper m-b-base" },
                t.div(
                    { className: "grid" },
                    t.div(
                        { className: "col-lg-4" },
                        t.div(
                            { className: "card bordered p-base full-height" },
                            t.div({ className: "txt-bold txt-sm" }, "Posts"),
                            () => {
                                if (pageData.isLoading) {
                                    return t.div(
                                        { className: "txt-center m-t-base" },
                                        t.span({ className: "loader" }),
                                    );
                                }

                                if (!pageData.posts.length) {
                                    return t.p({ className: "txt-hint m-t-sm" }, "No posts.");
                                }

                                return t.div(
                                    { className: "list m-t-sm" },
                                    () =>
                                        pageData.posts.map((post) =>
                                            t.button(
                                                {
                                                    type: "button",
                                                    className: () =>
                                                        `btn block txt-left ${
                                                            pageData.activePostId == post.id
                                                                ? "primary"
                                                                : "transparent"
                                                        }`,
                                                    onclick: () => loadPost(post.id),
                                                },
                                                t.span({ className: "txt-ellipsis" }, () => postTitle(post)),
                                            )
                                        ),
                                );
                            },
                        ),
                    ),
                    t.div(
                        { className: "col-lg-8" },
                        t.form(
                            {
                                className: "grid card bordered p-base",
                                onsubmit: (e) => e.preventDefault(),
                            },
                            t.div(
                                { className: "col-lg-12" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-id" }, "Post ID"),
                                    t.input({
                                        id: "post-id",
                                        className: "input",
                                        value: () => pageData.activePostId || "-",
                                        readonly: true,
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-md-8" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-title" }, "Title"),
                                    t.input({
                                        id: "post-title",
                                        className: "input",
                                        value: () => pageData.title,
                                        oninput: (e) => (pageData.title = e.target.value),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-md-4" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-status" }, "Status"),
                                    t.select(
                                        {
                                            id: "post-status",
                                            className: "input select",
                                            value: () => pageData.status,
                                            onchange: (e) => {
                                                try {
                                                    ensureStatusTransition(e.target.value);
                                                    pageData.status = e.target.value;
                                                } catch (err) {
                                                    app.toasts.error(err.message);
                                                }
                                            },
                                        },
                                        t.option({ value: "draft" }, "draft"),
                                        t.option({ value: "in_review" }, "in_review"),
                                        t.option({ value: "scheduled" }, "scheduled"),
                                        t.option({ value: "published" }, "published"),
                                        t.option({ value: "archived" }, "archived"),
                                    ),
                                ),
                            ),
                            t.div(
                                { className: "col-lg-12" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-slug" }, "Slug"),
                                    t.input({
                                        id: "post-slug",
                                        className: "input",
                                        value: () => pageData.slug,
                                        oninput: (e) => (pageData.slug = e.target.value),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-lg-12" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-excerpt" }, "Excerpt"),
                                    t.textarea({
                                        id: "post-excerpt",
                                        className: "input",
                                        rows: 3,
                                        value: () => pageData.excerpt,
                                        oninput: (e) => (pageData.excerpt = e.target.value),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-lg-12" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-content-html" }, "Content HTML"),
                                    app.components.tiptap({
                                        id: "post-content-html",
                                        name: "content_html",
                                        value: () => pageData.contentHtml,
                                        placeholder: "输入正文内容，支持标题、列表、引用、代码块。",
                                        onchange: (html) => (pageData.contentHtml = html),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-md-6" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-seo-title" }, "SEO Title"),
                                    t.input({
                                        id: "post-seo-title",
                                        className: "input",
                                        value: () => pageData.seoTitle,
                                        oninput: (e) => (pageData.seoTitle = e.target.value),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-md-6" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-seo-description" }, "SEO Description"),
                                    t.input({
                                        id: "post-seo-description",
                                        className: "input",
                                        value: () => pageData.seoDescription,
                                        oninput: (e) => (pageData.seoDescription = e.target.value),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-md-6" },
                                t.div(
                                    { className: "field" },
                                    t.label({ htmlFor: "post-release-note" }, "Release Note"),
                                    t.input({
                                        id: "post-release-note",
                                        className: "input",
                                        placeholder: "本次发布说明",
                                        value: () => pageData.releaseNote,
                                        oninput: (e) => (pageData.releaseNote = e.target.value),
                                    }),
                                ),
                            ),
                            t.div(
                                { className: "col-lg-12" },
                                t.div(
                                    { className: "alert info" },
                                    t.div(
                                        { className: "txt-sm" },
                                        "发布策略：仅支持人工点击发布，不会自动触发构建。",
                                    ),
                                    t.div(
                                        { className: "txt-hint txt-xs m-t-xs" },
                                        () =>
                                            pageData.lastPublishedAt
                                                ? `最近发布时间：${pageData.lastPublishedAt}`
                                                : "最近发布时间：暂无",
                                    ),
                                ),
                            ),
                            () => {
                                if (!pageData.validationErrors.length) {
                                    return null;
                                }

                                return t.div(
                                    { className: "col-lg-12" },
                                    t.div(
                                        { className: "alert danger" },
                                        t.div({ className: "txt-bold m-b-xs" }, "发布前需要修复以下问题："),
                                        ...pageData.validationErrors.map((message) =>
                                            t.div({ className: "txt-sm" }, `- ${message}`)
                                        ),
                                    ),
                                );
                            },
                        ),
                    ),
                ),
            ),
        ),
        t.footer({ className: "page-footer" }, app.components.credits()),
    );
}
