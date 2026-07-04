//go:build no_admin_ui

package adminui

import "io/fs"

var DistFS fs.FS

func ResolveDistFS() fs.FS {
	return nil
}
