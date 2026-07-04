package httpserver

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	adminui "gopress/admin"
	"gopress/internal/web/config"
	"gopress/internal/web/handler"
)

type Server struct {
	httpServer *http.Server
	logger     *slog.Logger
}

func New(
	cfg config.Config,
	logger *slog.Logger,
) (*Server, error) {
	health := handler.GetHealthIns()
	post := handler.GetPostIns()
	site, err := handler.GetSiteIns(cfg, logger)
	if err != nil {
		return nil, err
	}
	release, err := handler.GetReleaseIns(cfg, logger)
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()

	// Health check endpoint used by probes and uptime monitors.
	mux.HandleFunc("GET /healthz", health.GetHealthz)

	// Content management APIs for post lifecycle operations.
	mux.HandleFunc("GET /api/v1/posts", post.List)
	mux.HandleFunc("POST /api/v1/posts", post.CreateDraft)
	mux.HandleFunc("GET /api/v1/posts/{id}", post.GetByID)
	mux.HandleFunc("PATCH /api/v1/posts/{id}", post.SaveDraft)
	mux.HandleFunc("POST /api/v1/posts/{id}/request-review", post.RequestReview)
	mux.HandleFunc("POST /api/v1/posts/{id}/schedule", post.Schedule)
	mux.HandleFunc("POST /api/v1/posts/{id}/publish", post.Publish)
	mux.HandleFunc("POST /api/v1/posts/{id}/archive", post.Archive)

	// Trigger static site generation for current content state.
	mux.HandleFunc("POST /api/v1/site/build", site.TriggerBuild)

	// Release management APIs for build artifacts and deployments.
	mux.HandleFunc("GET /api/v1/releases", release.List)
	mux.HandleFunc("POST /api/v1/releases", release.Create)
	mux.HandleFunc("GET /api/v1/releases/{id}", release.GetByID)
	mux.HandleFunc("PATCH /api/v1/releases/{id}", release.Update)
	mux.HandleFunc("POST /api/v1/releases/{id}/trigger", release.Trigger)

	// Frontend routes: admin SPA under /_admin and generated site under /.
	registerAdminUIRoutes(mux, logger)
	registerSiteDistRoutes(mux, cfg.SiteDir, logger)
	loggedHandler := withBusinessLog(mux, logger)

	return &Server{
		httpServer: &http.Server{
			Addr:         fmt.Sprintf(":%d", cfg.Port),
			Handler:      loggedHandler,
			ReadTimeout:  cfg.ReadTimeout,
			WriteTimeout: cfg.WriteTimeout,
		},
		logger: logger,
	}, nil
}

func registerAdminUIRoutes(mux *http.ServeMux, logger *slog.Logger) {
	adminFS := adminui.ResolveDistFS()
	if adminFS == nil {
		logger.Warn("admin ui route disabled: embedded dist fs not found")
		return
	}
	logger.Info("admin ui route enabled", "prefix", "/_admin/")

	static := http.FileServer(http.FS(adminFS))
	strip := http.StripPrefix("/_admin/", static)

	mux.HandleFunc("GET /_admin", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/_admin/", http.StatusTemporaryRedirect)
	})
	mux.HandleFunc("GET /_admin/", func(w http.ResponseWriter, r *http.Request) {
		suffix, ok := strings.CutPrefix(r.URL.Path, "/_admin/")
		if !ok {
			logger.Warn("admin path prefix mismatch", "path", r.URL.Path)
			http.NotFound(w, r)
			return
		}
		name := strings.TrimPrefix(path.Clean("/"+suffix), "/")
		if name == "" || name == "." {
			logger.Info("admin spa index served", "path", r.URL.Path)
			serveAdminIndex(adminFS, w, r)
			return
		}
		if !fs.ValidPath(name) {
			logger.Warn("admin path rejected: invalid fs path", "path", r.URL.Path, "name", name)
			http.NotFound(w, r)
			return
		}
		if _, err := fs.Stat(adminFS, name); err == nil {
			logger.Info("admin static asset served", "path", r.URL.Path, "name", name)
			strip.ServeHTTP(w, r)
			return
		}
		logger.Warn("admin asset not found, fallback to spa index", "path", r.URL.Path, "name", name)
		serveAdminIndex(adminFS, w, r)
	})
}

func registerSiteDistRoutes(mux *http.ServeMux, siteDir string, logger *slog.Logger) {
	if siteDir == "" {
		logger.Warn("site dist route disabled: SITE_DIR is empty")
		return
	}

	distDir := filepath.Join(siteDir, "dist")
	distFS := os.DirFS(distDir)
	if _, err := fs.Stat(distFS, "."); err != nil {
		logger.Warn("site dist route disabled: dist directory unavailable", "dir", distDir, "err", err)
		return
	}
	logger.Info("site dist route enabled", "dir", distDir)

	static := http.FileServer(http.FS(distFS))
	mux.Handle("/", static)
}

func serveAdminIndex(distFS fs.FS, w http.ResponseWriter, _ *http.Request) {
	f, err := distFS.Open("index.html")
	if err != nil {
		http.Error(w, "admin ui unavailable", http.StatusNotFound)
		return
	}
	defer f.Close()

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = io.Copy(w, f)
}

func withBusinessLog(next http.Handler, logger *slog.Logger) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(rec, r)

		kind := "site"
		switch {
		case r.URL.Path == "/healthz":
			kind = "health"
		case strings.HasPrefix(r.URL.Path, "/api/"):
			kind = "api"
		case strings.HasPrefix(r.URL.Path, "/_admin"):
			kind = "admin"
		}

		level := slog.LevelInfo
		if rec.statusCode >= http.StatusBadRequest {
			level = slog.LevelWarn
		}
		logger.Log(r.Context(), level, "request completed",
			"kind", kind,
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.statusCode,
			"duration", time.Since(start).String(),
			"remote", r.RemoteAddr,
		)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	statusCode int
}

func (r *statusRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func (s *Server) Run() error {
	s.logger.Info("server starting", "addr", s.httpServer.Addr)
	if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func (s *Server) Shutdown(ctx context.Context, timeout time.Duration) error {
	shutdownCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	return s.httpServer.Shutdown(shutdownCtx)
}
