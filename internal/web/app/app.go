package app

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"gopress/internal/web/config"
	"gopress/internal/web/httpserver"
	"gopress/internal/web/repository"
	"gopress/pkg/logger"
)

type App struct {
	cfg    config.Config
	logger *slog.Logger
	server *httpserver.Server
}

func New(cfg config.Config) (*App, error) {
	l := logger.New(cfg.Env)

	_, _, err := repository.GetIns(cfg, l)
	if err != nil {
		return nil, err
	}
	server, err := httpserver.New(cfg, l)
	if err != nil {
		return nil, err
	}

	return &App{
		cfg:    cfg,
		logger: l,
		server: server,
	}, nil
}

func (a *App) Run() error {
	errCh := make(chan error, 1)

	go func() {
		errCh <- a.server.Run()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		return err
	case sig := <-sigCh:
		a.logger.Info("shutdown signal received", "signal", sig.String())
		if err := a.server.Shutdown(context.Background(), a.cfg.ShutdownTimeout); err != nil {
			return err
		}

		err := <-errCh
		if errors.Is(err, context.Canceled) || err == nil {
			return nil
		}
		return err
	}
}
