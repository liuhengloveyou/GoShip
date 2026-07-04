//go:build !no_ui

// Package ui handles the PocketBase Superuser frontend embedding.
package ui

import (
	"embed"
	"io/fs"
)

//go:generate sh -c "CI=true pnpm install --frozen-lockfile && CI=true pnpm run build"
//go:embed all:dist
var distDir embed.FS

// DistDirFS contains the embedded dist directory files (without the "dist" prefix)
var DistDirFS, _ = fs.Sub(distDir, "dist")
