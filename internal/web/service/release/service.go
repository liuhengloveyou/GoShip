package release

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"sync/atomic"
	"time"
)

var ErrBuildAlreadyRunning = errors.New("site build is already running")

type Service struct {
	siteDir      string
	buildCmd     string
	buildTimeout time.Duration
	logger       *slog.Logger
	running      atomic.Bool
}

func NewBuildService(siteDir, buildCmd string, buildTimeout time.Duration, logger *slog.Logger) (*Service, error) {
	return &Service{
		siteDir:      siteDir,
		buildCmd:     buildCmd,
		buildTimeout: buildTimeout,
		logger:       logger,
	}, nil
}

func (s *Service) TriggerBuild() error {
	if !s.running.CompareAndSwap(false, true) {
		return ErrBuildAlreadyRunning
	}

	go func() {
		defer s.running.Store(false)

		ctx, cancel := context.WithTimeout(context.Background(), s.buildTimeout)
		defer cancel()

		cmd := exec.CommandContext(ctx, "sh", "-lc", s.buildCmd)
		cmd.Dir = s.siteDir
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		start := time.Now()
		exporter, err := getMarkdownExporterIns(s.siteDir)
		if err != nil {
			s.logger.Error("init markdown exporter failed", "error", fmt.Errorf("get markdown exporter instance: %w", err))
			return
		}
		if err := exporter.Export(ctx); err != nil {
			s.logger.Error("site content export failed", "error", err)
			return
		}
		s.logger.Info("site build started", "dir", s.siteDir, "cmd", s.buildCmd)
		if err := cmd.Run(); err != nil {
			s.logger.Error("site build failed", "error", err, "duration", time.Since(start).String())
			return
		}
		s.logger.Info("site build completed", "duration", time.Since(start).String())
	}()

	return nil
}
