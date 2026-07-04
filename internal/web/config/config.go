package config

import (
	"os"
	"path/filepath"
	"strconv"
	"time"
)

type Config struct {
	Env              string
	Port             int
	ReadTimeout      time.Duration
	WriteTimeout     time.Duration
	ShutdownTimeout  time.Duration
	DBFile           string
	SiteDir          string
	SiteBuildCmd     string
	SiteBuildToken   string
	SiteBuildTimeout time.Duration
}

func Load() Config {
	siteDir := envOr("SITE_DIR", "./site")
	if !filepath.IsAbs(siteDir) {
		if abs, err := filepath.Abs(siteDir); err == nil {
			siteDir = abs
		}
	}
	dbFile := envOr("APP_DB_FILE", "./data/gopress.db")
	if !filepath.IsAbs(dbFile) {
		if abs, err := filepath.Abs(dbFile); err == nil {
			dbFile = abs
		}
	}

	return Config{
		Env:              envOr("APP_ENV", "dev"),
		Port:             intOr("APP_PORT", 10001),
		ReadTimeout:      durationOr("APP_READ_TIMEOUT", 10*time.Second),
		WriteTimeout:     durationOr("APP_WRITE_TIMEOUT", 15*time.Second),
		ShutdownTimeout:  durationOr("APP_SHUTDOWN_TIMEOUT", 10*time.Second),
		DBFile:           dbFile,
		SiteDir:          siteDir,
		SiteBuildCmd:     envOr("SITE_BUILD_CMD", "pnpm build"),
		SiteBuildToken:   envOr("SITE_BUILD_TOKEN", ""),
		SiteBuildTimeout: durationOr("SITE_BUILD_TIMEOUT", 8*time.Minute),
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func intOr(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}

	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func durationOr(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}

	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}
