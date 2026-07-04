package post

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gopress/internal/web/domain"
	"gopress/internal/web/repository"
	postrepo "gopress/internal/web/repository/post"
)

var (
	ErrInvalidState = errors.New("invalid post state transition")
	ErrPostNotFound = postrepo.ErrNotFound
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) List(ctx context.Context) ([]domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return nil, err
	}
	return repo.List(ctx)
}

func (s *Service) GetByID(ctx context.Context, postID string) (domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	return repo.GetByID(ctx, postID)
}

func (s *Service) CreateDraft(ctx context.Context) (domain.Post, error) {
	now := nowISO()
	id := newID()
	contentJSON, _ := json.Marshal(map[string]any{
		"type": "doc",
		"content": []map[string]any{
			{"type": "paragraph"},
		},
	})
	post := domain.Post{
		ID:             id,
		Title:          "未命名文章",
		Slug:           slugifyFallback(id),
		Excerpt:        "",
		ContentJSON:    contentJSON,
		ContentHTML:    "<p></p>",
		Status:         "draft",
		Tags:           []string{},
		Category:       "",
		SEOTitle:       "",
		SEODescription: "",
		SEOKeywords:    "",
		CanonicalURL:   "",
		Created:        now,
		Updated:        now,
	}
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	return post, repo.Save(ctx, post)
}

func (s *Service) SaveDraft(ctx context.Context, postID string, input domain.PostDraftInput) (domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	post, err := repo.GetByID(ctx, postID)
	if err != nil {
		return domain.Post{}, err
	}
	if post.Status == "archived" {
		return domain.Post{}, errors.New("archived post is read-only")
	}

	if input.Title != nil {
		post.Title = *input.Title
	}
	if input.Slug != nil {
		trimmed := strings.TrimSpace(*input.Slug)
		if trimmed != "" {
			post.Slug = trimmed
		}
	}
	if input.Excerpt != nil {
		post.Excerpt = *input.Excerpt
	}
	if input.ContentJSON != nil {
		post.ContentJSON = *input.ContentJSON
	}
	if input.ContentHTML != nil {
		post.ContentHTML = *input.ContentHTML
	}
	if input.Tags != nil {
		post.Tags = *input.Tags
	}
	if input.Category != nil {
		post.Category = *input.Category
	}
	if input.SEOTitle != nil {
		post.SEOTitle = *input.SEOTitle
	}
	if input.SEODescription != nil {
		post.SEODescription = *input.SEODescription
	}
	if input.SEOKeywords != nil {
		post.SEOKeywords = *input.SEOKeywords
	}
	if input.CanonicalURL != nil {
		post.CanonicalURL = *input.CanonicalURL
	}
	if input.RobotsNoindex != nil {
		post.RobotsNoindex = *input.RobotsNoindex
	}
	if input.RobotsNofollow != nil {
		post.RobotsNofollow = *input.RobotsNofollow
	}
	post.Updated = nowISO()

	return post, repo.Save(ctx, post)
}

func (s *Service) Publish(ctx context.Context, postID string) (domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	record, err := repo.GetByID(ctx, postID)
	if err != nil {
		return domain.Post{}, err
	}

	switch record.Status {
	case "draft", "in_review", "scheduled", "published":
	default:
		return domain.Post{}, ErrInvalidState
	}

	now := nowISO()
	record.Status = "published"
	if record.PublishedAt == nil {
		record.PublishedAt = &now
	}
	record.Updated = now

	return record, repo.Save(ctx, record)
}

func (s *Service) RequestReview(ctx context.Context, postID string) (domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	record, err := repo.GetByID(ctx, postID)
	if err != nil {
		return domain.Post{}, err
	}
	if record.Status != "draft" {
		return domain.Post{}, ErrInvalidState
	}
	record.Status = "in_review"
	record.Updated = nowISO()
	return record, repo.Save(ctx, record)
}

func (s *Service) Schedule(ctx context.Context, postID string, scheduledAt string) (domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	record, err := repo.GetByID(ctx, postID)
	if err != nil {
		return domain.Post{}, err
	}
	switch record.Status {
	case "draft", "in_review", "scheduled":
	default:
		return domain.Post{}, ErrInvalidState
	}
	record.Status = "scheduled"
	record.ScheduledAt = &scheduledAt
	record.Updated = nowISO()
	return record, repo.Save(ctx, record)
}

func (s *Service) Archive(ctx context.Context, postID string) (domain.Post, error) {
	repo, err := repository.GetPostIns()
	if err != nil {
		return domain.Post{}, err
	}
	record, err := repo.GetByID(ctx, postID)
	if err != nil {
		return domain.Post{}, err
	}
	record.Status = "archived"
	record.Updated = nowISO()
	return record, repo.Save(ctx, record)
}

func nowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func slugifyFallback(id string) string {
	if len(id) <= 8 {
		return "draft-" + id
	}
	return "draft-" + id[:8]
}
