package release

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"gopress/internal/web/domain"
)

var ErrNotFound = errors.New("release task not found")

type Repository interface {
	List(ctx context.Context, limit int) ([]domain.ReleaseTask, error)
	GetByID(ctx context.Context, id string) (domain.ReleaseTask, error)
	Save(ctx context.Context, task domain.ReleaseTask) error
}

type MemoryRepository struct {
	mu       sync.RWMutex
	tasks    map[string]domain.ReleaseTask
	dataFile string
}

func NewMemoryRepository(dataFile string) *MemoryRepository {
	r := &MemoryRepository{
		tasks:    map[string]domain.ReleaseTask{},
		dataFile: dataFile,
	}
	_ = r.loadFromDisk()
	return r
}

func (r *MemoryRepository) List(_ context.Context, limit int) ([]domain.ReleaseTask, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	rows := make([]domain.ReleaseTask, 0, len(r.tasks))
	for _, t := range r.tasks {
		rows = append(rows, t)
	}
	sort.Slice(rows, func(i, j int) bool {
		li := ""
		if rows[i].CreatedAt != nil {
			li = *rows[i].CreatedAt
		}
		lj := ""
		if rows[j].CreatedAt != nil {
			lj = *rows[j].CreatedAt
		}
		return li > lj
	})
	if limit > 0 && len(rows) > limit {
		rows = rows[:limit]
	}
	return rows, nil
}

func (r *MemoryRepository) GetByID(_ context.Context, id string) (domain.ReleaseTask, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	t, ok := r.tasks[id]
	if !ok {
		return domain.ReleaseTask{}, ErrNotFound
	}
	return t, nil
}

func (r *MemoryRepository) Save(_ context.Context, task domain.ReleaseTask) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tasks[task.ID] = task
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
	var rows []domain.ReleaseTask
	if err := json.Unmarshal(raw, &rows); err != nil {
		return err
	}
	r.tasks = map[string]domain.ReleaseTask{}
	for _, t := range rows {
		r.tasks[t.ID] = t
	}
	return nil
}

func (r *MemoryRepository) saveToDisk() error {
	if r.dataFile == "" {
		return nil
	}
	rows := make([]domain.ReleaseTask, 0, len(r.tasks))
	for _, t := range r.tasks {
		rows = append(rows, t)
	}
	sort.Slice(rows, func(i, j int) bool {
		li := ""
		if rows[i].CreatedAt != nil {
			li = *rows[i].CreatedAt
		}
		lj := ""
		if rows[j].CreatedAt != nil {
			lj = *rows[j].CreatedAt
		}
		return li > lj
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
