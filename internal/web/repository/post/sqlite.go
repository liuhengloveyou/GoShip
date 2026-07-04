package post

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

func (r *SQLiteRepository) List(ctx context.Context) ([]domain.Post, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, payload
		FROM posts
		ORDER BY updated DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]domain.Post, 0)
	for rows.Next() {
		var id string
		var payload []byte
		if err := rows.Scan(&id, &payload); err != nil {
			return nil, err
		}
		var p domain.Post
		if err := json.Unmarshal(payload, &p); err != nil {
			return nil, err
		}
		result = append(result, clonePost(p))
	}
	return result, rows.Err()
}

func (r *SQLiteRepository) GetByID(ctx context.Context, id string) (domain.Post, error) {
	var payload []byte
	err := r.db.QueryRowContext(ctx, `
		SELECT payload
		FROM posts
		WHERE id = ?
	`, id).Scan(&payload)
	if err != nil {
		if err == sql.ErrNoRows {
			return domain.Post{}, ErrNotFound
		}
		return domain.Post{}, err
	}
	var p domain.Post
	if err := json.Unmarshal(payload, &p); err != nil {
		return domain.Post{}, err
	}
	return clonePost(p), nil
}

func (r *SQLiteRepository) Save(ctx context.Context, record domain.Post) error {
	payload, err := json.Marshal(record)
	if err != nil {
		return err
	}
	tagsJSON, err := json.Marshal(record.Tags)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO posts (
			id, updated, slug, status, title, tags_json, payload
		) VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			updated = excluded.updated,
			slug = excluded.slug,
			status = excluded.status,
			title = excluded.title,
			tags_json = excluded.tags_json,
			payload = excluded.payload
	`, record.ID, record.Updated, record.Slug, record.Status, record.Title, string(tagsJSON), string(payload))
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
		CREATE TABLE IF NOT EXISTS posts (
			id TEXT PRIMARY KEY,
			updated TEXT NOT NULL,
			slug TEXT NOT NULL,
			status TEXT NOT NULL,
			title TEXT NOT NULL,
			tags_json TEXT NOT NULL DEFAULT '[]',
			payload TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_posts_updated ON posts(updated DESC);
	`)
	return err
}
