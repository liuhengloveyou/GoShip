package main

import (
	"log"

	"gopress/internal/web/app"
	"gopress/internal/web/config"
)

func main() {
	cfg := config.Load()
	application, err := app.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	if err := application.Run(); err != nil {
		log.Fatal(err)
	}
}
