//go:build !no_admin_ui

package adminui

import (
	"embed"
	"io/fs"
)

//go:generate sh ../scripts/build-admin.sh
//go:embed all:dist
var distDir embed.FS

var DistFS, _ = fs.Sub(distDir, "dist")

func ResolveDistFS() fs.FS {
	if DistFS != nil {
		return DistFS
	}
	return nil
}
