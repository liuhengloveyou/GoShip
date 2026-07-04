package release

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"gopress/internal/web/domain"
	releaserepo "gopress/internal/web/repository/release"
)

var ErrReleaseNotFound = releaserepo.ErrNotFound

type TaskService struct {
	repo  releaserepo.Repository
	build *Service
}

func NewTaskService(repo releaserepo.Repository, build *Service) *TaskService {
	return &TaskService{repo: repo, build: build}
}

func (s *TaskService) List(ctx context.Context, limit int) ([]domain.ReleaseTask, error) {
	return s.repo.List(ctx, limit)
}

func (s *TaskService) GetByID(ctx context.Context, id string) (domain.ReleaseTask, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *TaskService) Create(ctx context.Context, task domain.ReleaseTask) (domain.ReleaseTask, error) {
	now := nowISO()
	if task.ID == "" {
		task.ID = newID()
	}
	if task.CreatedAt == nil {
		task.CreatedAt = &now
	}
	task.UpdatedAt = &now
	if task.Status == "" {
		task.Status = "queued"
	}
	return task, s.repo.Save(ctx, task)
}

func (s *TaskService) Update(ctx context.Context, id string, patch domain.ReleaseTask) (domain.ReleaseTask, error) {
	task, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return domain.ReleaseTask{}, err
	}
	if patch.Status != "" {
		task.Status = patch.Status
	}
	if patch.Note != nil {
		task.Note = patch.Note
	}
	if patch.Operator != nil {
		task.Operator = patch.Operator
	}
	if patch.RollbackOfReleaseID != nil {
		task.RollbackOfReleaseID = patch.RollbackOfReleaseID
	}
	if patch.Stage != nil {
		task.Stage = patch.Stage
	}
	if patch.DurationMs != nil {
		task.DurationMs = patch.DurationMs
	}
	if patch.ErrorCode != nil {
		task.ErrorCode = patch.ErrorCode
	}
	if patch.ErrorMessage != nil {
		task.ErrorMessage = patch.ErrorMessage
	}
	if patch.TriggeredAt != nil {
		task.TriggeredAt = patch.TriggeredAt
	}
	now := nowISO()
	task.UpdatedAt = &now
	return task, s.repo.Save(ctx, task)
}

func (s *TaskService) TriggerBuild(_ context.Context, _ string) error {
	if s.build == nil {
		return errors.New("build service unavailable")
	}
	return s.build.TriggerBuild()
}

func newID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(b)
}

func nowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}
