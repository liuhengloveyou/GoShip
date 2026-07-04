package handler

import (
	"log/slog"
	"sync"

	"gopress/internal/web/config"
	"gopress/internal/web/repository"
	postservice "gopress/internal/web/service/post"
	releaseservice "gopress/internal/web/service/release"
)

var (
	healthHandlerOnce sync.Once
	healthHandlerIns  *HealthHandler

	postHandlerOnce sync.Once
	postHandlerIns  *PostHandler

	siteHandlerOnce    sync.Once
	siteHandlerIns     *SiteHandler
	siteHandlerInitErr error

	releaseHandlerOnce    sync.Once
	releaseHandlerIns     *ReleaseHandler
	releaseHandlerInitErr error
)

func GetHealthIns() *HealthHandler {
	healthHandlerOnce.Do(func() {
		healthHandlerIns = NewHealthHandler()
	})
	return healthHandlerIns
}

func GetPostIns() *PostHandler {
	postHandlerOnce.Do(func() {
		postHandlerIns = NewPostHandler(postservice.NewService())
	})
	return postHandlerIns
}

func GetSiteIns(cfg config.Config, logger *slog.Logger) (*SiteHandler, error) {
	siteHandlerOnce.Do(func() {
		buildService, err := releaseservice.NewBuildService(
			cfg.SiteDir,
			cfg.SiteBuildCmd,
			cfg.SiteBuildTimeout,
			logger,
		)
		if err != nil {
			siteHandlerInitErr = err
			return
		}
		siteHandlerIns = NewSiteHandler(buildService, cfg.SiteBuildToken)
	})
	if siteHandlerInitErr != nil {
		return nil, siteHandlerInitErr
	}
	return siteHandlerIns, nil
}

func GetReleaseIns(cfg config.Config, logger *slog.Logger) (*ReleaseHandler, error) {
	releaseHandlerOnce.Do(func() {
		_, releaseRepository, err := repository.GetIns(cfg, logger)
		if err != nil {
			releaseHandlerInitErr = err
			return
		}
		buildService, err := releaseservice.NewBuildService(
			cfg.SiteDir,
			cfg.SiteBuildCmd,
			cfg.SiteBuildTimeout,
			logger,
		)
		if err != nil {
			releaseHandlerInitErr = err
			return
		}
		releaseHandlerIns = NewReleaseHandler(releaseservice.NewTaskService(releaseRepository, buildService))
	})
	if releaseHandlerInitErr != nil {
		return nil, releaseHandlerInitErr
	}
	return releaseHandlerIns, nil
}
