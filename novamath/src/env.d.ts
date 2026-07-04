interface Window {
  theme?: {
    themeValue: string;
    setPreference: () => void;
    reflectPreference: () => void;
    getTheme: () => string;
    setTheme: (val: string) => void;
  };
}

interface ImportMetaEnv {
  readonly CONTENT_SOURCE?: string;
  readonly GOPRESS_API_BASE?: string;
  readonly GOPRESS_API_TOKEN?: string;
  readonly CMS_API_URL?: string;
  readonly CMS_POSTS_COLLECTION?: string;
  readonly CMS_API_TOKEN?: string;
  readonly CMS_RELEASES_COLLECTION?: string;
  readonly CMS_RELEASE_WEBHOOK_URL?: string;
  readonly POCKETBASE_URL?: string;
  readonly POCKETBASE_POSTS_COLLECTION?: string;
  readonly POCKETBASE_API_TOKEN?: string;
}
