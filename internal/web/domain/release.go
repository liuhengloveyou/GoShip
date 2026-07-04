package domain

type ReleaseTask struct {
	ID                  string  `json:"id"`
	PostID              string  `json:"postId"`
	Status              string  `json:"status"`
	Note                *string `json:"note,omitempty"`
	Operator            *string `json:"operator,omitempty"`
	RollbackOfReleaseID *string `json:"rollbackOfReleaseId,omitempty"`
	Stage               *string `json:"stage,omitempty"`
	DurationMs          *int    `json:"durationMs,omitempty"`
	ErrorCode           *string `json:"errorCode,omitempty"`
	ErrorMessage        *string `json:"errorMessage,omitempty"`
	TriggeredAt         *string `json:"triggeredAt,omitempty"`
	CreatedAt           *string `json:"createdAt,omitempty"`
	UpdatedAt           *string `json:"updatedAt,omitempty"`
}
