const DEFAULT_POSTS_COLLECTION = "posts";
const DEFAULT_RELEASES_COLLECTION = "releases";

function getCollectionName(envName, fallback) {
    return import.meta.env[envName] || fallback;
}

function postsCollection() {
    return getCollectionName("CMS_POSTS_COLLECTION", DEFAULT_POSTS_COLLECTION);
}

function releasesCollection() {
    return getCollectionName("CMS_RELEASES_COLLECTION", DEFAULT_RELEASES_COLLECTION);
}

export async function listPosts() {
    return app.pb.collection(postsCollection()).getList(1, 200, {
        sort: "-updated",
    });
}

export async function getPostById(id) {
    return app.pb.collection(postsCollection()).getOne(id);
}

export async function createDraft(payload) {
    return app.pb.collection(postsCollection()).create({
        ...payload,
        status: "draft",
    });
}

export async function updatePost(id, payload) {
    return app.pb.collection(postsCollection()).update(id, payload);
}

export async function publishPost(id, payload = {}) {
    return app.pb.collection(postsCollection()).update(id, {
        ...payload,
        status: "published",
        published_at: new Date().toISOString(),
    });
}

export async function createRelease(postId, note = "") {
    return app.pb.collection(releasesCollection()).create({
        post_id: postId,
        status: "queued",
        stage: "validate",
        note,
        operator: app.store.superuser?.email || "manual",
        triggered_at: new Date().toISOString(),
    });
}

export async function completeRelease(releaseId) {
    return app.pb.collection(releasesCollection()).update(releaseId, {
        status: "success",
        stage: "completed",
    });
}

export async function failRelease(releaseId, errorMessage) {
    return app.pb.collection(releasesCollection()).update(releaseId, {
        status: "failed",
        stage: "completed",
        error_message: errorMessage || "publish failed",
    });
}
