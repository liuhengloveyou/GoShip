package release

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"gopress/internal/web/repository"
	postrepo "gopress/internal/web/repository/post"
)

var invalidFileRune = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
var htmlAttrClass = regexp.MustCompile(`\sclass="[^"]*"`)
var htmlAttrTitle = regexp.MustCompile(`\stitle="[^"]*"`)
var htmlAttrTargetBlank = regexp.MustCompile(`\starget="_blank"`)
var htmlAttrRel = regexp.MustCompile(`\srel="[^"]*"`)

type MarkdownExporter struct {
	postRepo postrepo.Repository
	blogDir  string
}

var (
	markdownExporterOnce        sync.Once
	markdownExporterIns         *MarkdownExporter
	markdownExporterInitErr     error
	markdownExporterInsSiteDir  string
	ErrMarkdownExporterNotReady = errors.New("markdown exporter not initialized")
)

func getMarkdownExporterIns(siteDir string) (*MarkdownExporter, error) {
	markdownExporterOnce.Do(func() {
		markdownExporterInsSiteDir = siteDir
		postRepo, err := repository.GetPostIns()
		if err != nil {
			markdownExporterInitErr = err
			return
		}
		markdownExporterIns = &MarkdownExporter{
			postRepo: postRepo,
			blogDir:  filepath.Join(siteDir, "src", "data", "blog"),
		}
	})
	if markdownExporterInitErr != nil {
		return nil, markdownExporterInitErr
	}
	if markdownExporterIns == nil {
		return nil, ErrMarkdownExporterNotReady
	}
	return markdownExporterIns, nil
}

func (e *MarkdownExporter) Export(ctx context.Context) error {
	if e == nil || e.postRepo == nil {
		return nil
	}
	posts, err := e.postRepo.List(ctx)
	if err != nil {
		return fmt.Errorf("list posts for export: %w", err)
	}
	if err := os.MkdirAll(e.blogDir, 0o755); err != nil {
		return fmt.Errorf("ensure blog dir: %w", err)
	}
	for _, p := range posts {
		if p.Status != "published" {
			continue
		}
		name := sanitizeFileName(p.Slug)
		if name == "" {
			name = p.ID
		}
		file := filepath.Join(e.blogDir, name+".md")
		content := renderMarkdown(p.Title, pickTime(p.PublishedAt, p.Updated), p.Excerpt, p.Tags, p.ContentHTML)
		if err := os.WriteFile(file, []byte(content), 0o644); err != nil {
			return fmt.Errorf("write exported post %s: %w", p.ID, err)
		}
	}
	return nil
}

func renderMarkdown(title, pubDatetime, description string, tags []string, bodyHTML string) string {
	if strings.TrimSpace(title) == "" {
		title = "未命名文章"
	}
	if strings.TrimSpace(pubDatetime) == "" {
		pubDatetime = "1970-01-01T00:00:00Z"
	}
	if strings.TrimSpace(description) == "" {
		description = "GoPress 发布文章"
	}
	if len(tags) == 0 {
		tags = []string{"others"}
	}
	var b strings.Builder
	b.WriteString("---\n")
	b.WriteString("author: GoPress\n")
	b.WriteString(fmt.Sprintf("pubDatetime: %s\n", pubDatetime))
	b.WriteString(fmt.Sprintf("title: %q\n", title))
	b.WriteString("draft: false\n")
	b.WriteString("tags:\n")
	for _, tag := range tags {
		if strings.TrimSpace(tag) == "" {
			continue
		}
		b.WriteString(fmt.Sprintf("  - %q\n", tag))
	}
	b.WriteString(fmt.Sprintf("description: %q\n", description))
	b.WriteString("---\n\n")
	if strings.TrimSpace(bodyHTML) != "" {
		b.WriteString(normalizeBodyHTML(bodyHTML))
		b.WriteString("\n")
	}
	return b.String()
}

func normalizeBodyHTML(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}

	// Remove editor/site-specific presentational attributes for cleaner output.
	s = htmlAttrClass.ReplaceAllString(s, "")
	s = htmlAttrTitle.ReplaceAllString(s, "")
	s = htmlAttrTargetBlank.ReplaceAllString(s, "")
	s = htmlAttrRel.ReplaceAllString(s, "")

	// Add line breaks around common block tags to improve Markdown readability.
	replacements := []string{
		"</h1>", "</h2>", "</h3>", "</h4>", "</h5>", "</h6>",
		"</p>", "</li>", "</ul>", "</ol>", "</blockquote>",
		"</pre>", "</code>", "</table>", "</tr>",
	}
	for _, tag := range replacements {
		s = strings.ReplaceAll(s, tag, tag+"\n")
	}

	// Collapse excessive blank lines produced by formatting replacements.
	for strings.Contains(s, "\n\n\n") {
		s = strings.ReplaceAll(s, "\n\n\n", "\n\n")
	}
	return strings.TrimSpace(s)
}

func sanitizeFileName(s string) string {
	v := strings.TrimSpace(strings.ToLower(s))
	v = invalidFileRune.ReplaceAllString(v, "-")
	v = strings.Trim(v, "-.")
	return v
}

func pickTime(publishedAt *string, fallback string) string {
	if publishedAt != nil && strings.TrimSpace(*publishedAt) != "" {
		return *publishedAt
	}
	return fallback
}
