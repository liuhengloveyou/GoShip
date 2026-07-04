package release

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"

	"gopress/internal/web/domain"

	_ "modernc.org/sqlite"
)

type SQLiteRepository struct {
	db *sql.DB
}

func NewSQLiteRepository(dbFile string) (*SQLiteRepository, error) {
	if err := os.MkdirAll(filepath.Dir(dbFile), 0o755); err != nil {
		return nil, err
	}
	db, err := sql.Open("sqlite", dbFile)
	if err != nil {
		return nil, err
	}
	repo := &SQLiteRepository{db: db}
	if err := repo.initSchema(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return repo, nil
}

func (r *SQLiteRepository) List(ctx context.Context, limit int) ([]domain.ReleaseTask, error) {
	query := `
		SELECT payload
		FROM release_tasks
		ORDER BY created_at DESC
	`
	args := []any{}
	if limit > 0 {
		query += " LIMIT ?"
		args = append(args, limit)
	}
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]domain.ReleaseTask, 0)
	for rows.Next() {
		var payload []byte
		if err := rows.Scan(&payload); err != nil {
			return nil, err
		}
		var t domain.ReleaseTask
		if err := json.Unmarshal(payload, &t); err != nil {
			return nil, err
		}
		result = append(result, t)
	}
	return result, rows.Err()
}

func (r *SQLiteRepository) GetByID(ctx context.Context, id string) (domain.ReleaseTask, error) {
	var payload []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT payload
		FROM release_tasks
		WHERE id = ?
	`, id).Scan(&payload)
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.ReleaseTask{}, ErrNotFound
		}
		return domain.ReleaseTask{}, err
	}
	var t domain.ReleaseTask
	if err := json.Unmarshal(payload, &t); err != nil {
		return domain.ReleaseTask{}, err
	}
	return t, nil
}

func (r *SQLiteRepository) Save(ctx context.Context, task domain.ReleaseTask) error {
	payload, err := json.Marshal(task)
	if err != nil {
		return err
	}
	createdAt := ""
	if task.CreatedAt != nil {
		createdAt = *task.CreatedAt
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO release_tasks (
			id, post_id, status, created_at, payload
		) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			post_id = excluded.post_id,
			status = excluded.status,
			created_at = excluded.created_at,
			payload = excluded.payload
	`, task.ID, task.PostID, task.Status, createdAt, string(payload))
	return err
}

func (r *SQLiteRepository) Close() error {
	if r.db == nil {
		return nil
	}
	return r.db.Close()
}

func (r *SQLiteRepository) initSchema() error {
	_, err := r.db.Exec(`
		CREATE TABLE IF NOT EXISTS release_tasks (
			id TEXT PRIMARY KEY,
			post_id TEXT NOT NULL,
			status TEXT NOT NULL,
			created_at TEXT NOT NULL DEFAULT '',
			payload TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_release_tasks_created_at ON release_tasks(created_at DESC);
	`)
	return err
}
