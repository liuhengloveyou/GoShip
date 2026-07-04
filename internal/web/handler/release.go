package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"gopress/internal/web/domain"
	releaseservice "gopress/internal/web/service/release"
)

type ReleaseHandler struct {
	service *releaseservice.TaskService
}

func NewReleaseHandler(service *releaseservice.TaskService) *ReleaseHandler {
	return &ReleaseHandler{service: service}
}

func (h *ReleaseHandler) List(w http.ResponseWriter, r *http.Request) {
	limit := 20
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			limit = n
		}
	}
	rows, err := h.service.List(r.Context(), limit)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "failed to list releases"})
		return
	}
	writeJSON(w, http.StatusOK, rows)
}

func (h *ReleaseHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "release id is required"})
		return
	}
	row, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		writeReleaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, row)
}

func (h *ReleaseHandler) Create(w http.ResponseWriter, r *http.Request) {
	var payload domain.ReleaseTask
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid json body"})
		return
	}
	row, err := h.service.Create(r.Context(), payload)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "failed to create release"})
		return
	}
	writeJSON(w, http.StatusCreated, row)
}

func (h *ReleaseHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "release id is required"})
		return
	}
	var payload domain.ReleaseTask
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid json body"})
		return
	}
	row, err := h.service.Update(r.Context(), id, payload)
	if err != nil {
		writeReleaseError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, row)
}

func (h *ReleaseHandler) Trigger(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "release id is required"})
		return
	}
	if err := h.service.TriggerBuild(r.Context(), id); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "already running") {
			writeJSON(w, http.StatusConflict, map[string]any{"message": "site build is already running"})
			return
		}
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "failed to trigger release"})
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"ok": true, "releaseId": id})
}

func writeReleaseError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, releaseservice.ErrReleaseNotFound):
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "release not found"})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "internal server error"})
	}
}
