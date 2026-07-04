package handler

import (
	"errors"
	"net/http"
	"strings"

	releaseservice "gopress/internal/web/service/release"
)

type SiteHandler struct {
	service       *releaseservice.Service
	expectedToken string
}

func NewSiteHandler(service *releaseservice.Service, expectedToken string) *SiteHandler {
	return &SiteHandler{
		service:       service,
		expectedToken: expectedToken,
	}
}

func (h *SiteHandler) TriggerBuild(w http.ResponseWriter, r *http.Request) {
	if h.expectedToken != "" {
		token := strings.TrimSpace(r.Header.Get("X-Site-Build-Token"))
		if token != h.expectedToken {
			writeJSON(w, http.StatusUnauthorized, map[string]any{
				"ok":      false,
				"message": "invalid site build token",
			})
			return
		}
	}

	err := h.service.TriggerBuild()
	if err == nil {
		writeJSON(w, http.StatusAccepted, map[string]any{
			"ok":      true,
			"message": "site build triggered",
		})
		return
	}

	if errors.Is(err, releaseservice.ErrBuildAlreadyRunning) {
		writeJSON(w, http.StatusConflict, map[string]any{
			"ok":      false,
			"message": "site build is already running",
		})
		return
	}

	writeJSON(w, http.StatusInternalServerError, map[string]any{
		"ok":      false,
		"message": "failed to trigger site build",
	})
}
