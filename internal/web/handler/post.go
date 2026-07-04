package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"gopress/internal/web/domain"
	postservice "gopress/internal/web/service/post"
)

type PostHandler struct {
	service *postservice.Service
}

func NewPostHandler(service *postservice.Service) *PostHandler {
	return &PostHandler{service: service}
}

func (h *PostHandler) List(w http.ResponseWriter, r *http.Request) {
	posts, err := h.service.List(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "failed to list posts"})
		return
	}
	writeJSON(w, http.StatusOK, posts)
}

func (h *PostHandler) CreateDraft(w http.ResponseWriter, r *http.Request) {
	post, err := h.service.CreateDraft(r.Context())
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "failed to create draft"})
		return
	}
	writeJSON(w, http.StatusCreated, post)
}

func (h *PostHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.PathValue("id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "post id is required"})
		return
	}
	post, err := h.service.GetByID(r.Context(), postID)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) SaveDraft(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.PathValue("id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "post id is required"})
		return
	}
	var input domain.PostDraftInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid json body"})
		return
	}
	post, err := h.service.SaveDraft(r.Context(), postID, input)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Publish(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.PathValue("id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "post id is required"})
		return
	}
	post, err := h.service.Publish(r.Context(), postID)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) RequestReview(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.PathValue("id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "post id is required"})
		return
	}
	post, err := h.service.RequestReview(r.Context(), postID)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Schedule(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.PathValue("id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "post id is required"})
		return
	}
	var payload struct {
		ScheduledAt string `json:"scheduledAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "invalid json body"})
		return
	}
	if strings.TrimSpace(payload.ScheduledAt) == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "scheduledAt is required"})
		return
	}
	post, err := h.service.Schedule(r.Context(), postID, payload.ScheduledAt)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (h *PostHandler) Archive(w http.ResponseWriter, r *http.Request) {
	postID := strings.TrimSpace(r.PathValue("id"))
	if postID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]any{"message": "post id is required"})
		return
	}
	post, err := h.service.Archive(r.Context(), postID)
	if err != nil {
		writePostError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func writePostError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, postservice.ErrPostNotFound):
		writeJSON(w, http.StatusNotFound, map[string]any{"message": "post not found"})
	case errors.Is(err, postservice.ErrInvalidState):
		writeJSON(w, http.StatusConflict, map[string]any{"message": "invalid post state"})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]any{"message": "internal server error"})
	}
}
