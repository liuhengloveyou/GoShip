package repository

import (
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"gopress/internal/web/config"
	postrepo "gopress/internal/web/repository/post"
	releaserepo "gopress/internal/web/repository/release"
)

var (
	ErrNotInitialized     = errors.New("repositories are not initialized")
	repositoriesOnce      sync.Once
	repositoriesInitErr   error
	postRepositoryIns     postrepo.Repository
	releaseRepositoryIns  releaserepo.Repository
	repositoriesInsDBFile string
)

func GetIns(cfg config.Config, l *slog.Logger) (postrepo.Repository, releaserepo.Repository, error) {
	repositoriesOnce.Do(func() {
		repositoriesInsDBFile = cfg.DBFile
		postRepo, releaseRepo, err := buildRepositories(cfg)
		if err != nil {
			repositoriesInitErr = err
			return
		}
		postRepositoryIns = postRepo
		releaseRepositoryIns = releaseRepo
		l.Info("repositories initialized with sqlite", "dbFile", cfg.DBFile)
	})
	if repositoriesInitErr != nil {
		return nil, nil, repositoriesInitErr
	}
	if repositoriesInsDBFile != cfg.DBFile {
		l.Warn("sqlite repositories already initialized with a different db file", "initializedDBFile", repositoriesInsDBFile, "currentDBFile", cfg.DBFile)
	}
	return postRepositoryIns, releaseRepositoryIns, nil
}

func GetPostIns() (postrepo.Repository, error) {
	if postRepositoryIns == nil {
		return nil, ErrNotInitialized
	}
	return postRepositoryIns, nil
}

func buildRepositories(cfg config.Config) (postrepo.Repository, releaserepo.Repository, error) {
	postSQLite, err := postrepo.NewSQLiteRepository(cfg.DBFile)
	if err != nil {
		return nil, nil, fmt.Errorf("init post sqlite repository: %w", err)
	}
	releaseSQLite, err := releaserepo.NewSQLiteRepository(cfg.DBFile)
	if err != nil {
		_ = postSQLite.Close()
		return nil, nil, fmt.Errorf("init release sqlite repository: %w", err)
	}
	return postSQLite, releaseSQLite, nil
}
