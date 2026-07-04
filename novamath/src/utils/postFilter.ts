import type { BlogPost } from "@/content";
import { SITE } from "@/config";

const postFilter = ({ data }: BlogPost) => {
  const status = data.status ?? (data.draft ? "draft" : "published");
  if (status !== "published") {
    return false;
  }

  const isPublishTimePassed =
    Date.now() >
    new Date(data.pubDatetime).getTime() - SITE.scheduledPostMargin;
  return !data.draft && (import.meta.env.DEV || isPublishTimePassed);
};

export default postFilter;
