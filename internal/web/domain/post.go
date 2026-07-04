package domain

import "encoding/json"

type Post struct {
	ID                     string          `json:"id"`
	Title                  string          `json:"title"`
	Slug                   string          `json:"slug"`
	Excerpt                string          `json:"excerpt"`
	ContentJSON            json.RawMessage `json:"content_json"`
	ContentHTML            string          `json:"content_html"`
	Status                 string          `json:"status"`
	Tags                   []string        `json:"tags"`
	Category               string          `json:"category"`
	CoverAssetID           *string         `json:"cover_asset_id"`
	AuthorID               *string         `json:"author_id"`
	PublishedAt            *string         `json:"published_at"`
	ScheduledAt            *string         `json:"scheduled_at"`
	SEOTitle               string          `json:"seo_title"`
	SEODescription         string          `json:"seo_description"`
	SEOKeywords            string          `json:"seo_keywords"`
	SEOImageAssetID        *string         `json:"seo_image_asset_id"`
	CanonicalURL           string          `json:"canonical_url"`
	RobotsNoindex          bool            `json:"robots_noindex"`
	RobotsNofollow         bool            `json:"robots_nofollow"`
	LastReleaseID          *string         `json:"last_release_id"`
	LastReleaseAt          *string         `json:"last_release_at"`
	LastReleaseContentHash *string         `json:"last_release_content_hash"`
	ReleaseNote            *string         `json:"release_note"`
	ContentHash            *string         `json:"content_hash"`
	Created                string          `json:"created"`
	Updated                string          `json:"updated"`
}

type PostDraftInput struct {
	Title          *string          `json:"title,omitempty"`
	Slug           *string          `json:"slug,omitempty"`
	Excerpt        *string          `json:"excerpt,omitempty"`
	ContentJSON    *json.RawMessage `json:"content_json,omitempty"`
	ContentHTML    *string          `json:"content_html,omitempty"`
	Tags           *[]string        `json:"tags,omitempty"`
	Category       *string          `json:"category,omitempty"`
	SEOTitle       *string          `json:"seo_title,omitempty"`
	SEODescription *string          `json:"seo_description,omitempty"`
	SEOKeywords    *string          `json:"seo_keywords,omitempty"`
	CanonicalURL   *string          `json:"canonical_url,omitempty"`
	RobotsNoindex  *bool            `json:"robots_noindex,omitempty"`
	RobotsNofollow *bool            `json:"robots_nofollow,omitempty"`
}
