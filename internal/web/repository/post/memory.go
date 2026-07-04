package post

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"sync"

	"gopress/internal/web/domain"
)

var ErrNotFound = errors.New("post not found")

type Repository interface {
	List(ctx context.Context) ([]domain.Post, error)
	GetByID(ctx context.Context, id string) (domain.Post, error)
	Save(ctx context.Context, record domain.Post) error
}

type MemoryRepository struct {
	mu       sync.RWMutex
	posts    map[string]domain.Post
	dataFile string
}

func NewMemoryRepository(dataFile string) *MemoryRepository {
	r := &MemoryRepository{
		posts:    map[string]domain.Post{},
		dataFile: dataFile,
	}
	_ = r.loadFromDisk()
	return r
}

func (r *MemoryRepository) List(_ context.Context) ([]domain.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	rows := make([]domain.Post, 0, len(r.posts))
	for _, p := range r.posts {
		rows = append(rows, clonePost(p))
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].Updated > rows[j].Updated
	})
	return rows, nil
}

func (r *MemoryRepository) GetByID(_ context.Context, id string) (domain.Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	post, ok := r.posts[id]
	if !ok {
		return domain.Post{}, ErrNotFound
	}

	return clonePost(post), nil
}

func (r *MemoryRepository) Save(_ context.Context, record domain.Post) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.posts[record.ID] = clonePost(record)
	return r.saveToDisk()
}

func (r *MemoryRepository) loadFromDisk() error {
	if r.dataFile == "" {
		return nil
	}
	raw, err := os.ReadFile(r.dataFile)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}

	var rows []domain.Post
	if err := json.Unmarshal(raw, &rows); err != nil {
		return err
	}

	r.posts = map[string]domain.Post{}
	for _, p := range rows {
		r.posts[p.ID] = clonePost(p)
	}
	return nil
}

func (r *MemoryRepository) saveToDisk() error {
	if r.dataFile == "" {
		return nil
	}
	rows := make([]domain.Post, 0, len(r.posts))
	for _, p := range r.posts {
		rows = append(rows, clonePost(p))
	}
	sort.Slice(rows, func(i, j int) bool {
		return rows[i].Updated > rows[j].Updated
	})

	if err := os.MkdirAll(filepath.Dir(r.dataFile), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(r.dataFile, data, 0o644)
}

func clonePost(p domain.Post) domain.Post {
	cp := p
	cp.Tags = slices.Clone(p.Tags)
	cp.ContentJSON = slices.Clone(p.ContentJSON)
	return cp
}
