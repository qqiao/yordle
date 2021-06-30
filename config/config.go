// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2017 The Yordle Team
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

// Package config provides configuration information of the Yordle application
// and helper methods for loading and saving configuration parameters.
package config

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"os"

	"github.com/qqiao/buildinfo"
)

// B is the build information instance
var B buildinfo.BuildInfo

// Locales contains all supported locals
var Locales []string

// ProjectName is used for identifying of the project to the runtime.
var ProjectName string

type LitLocalize struct {
	SourceLocale  string   `json:"sourceLocale"`
	TargetLocales []string `json:"targetLocales"`
}

func init() {
	B, _ = buildinfo.Load("build_info.json")
	ProjectName = os.Getenv("GOOGLE_CLOUD_PROJECT")

	Locales = loadLocalizeConfig()
	log.Printf("Available locales: %v", Locales)
}

func loadLocalizeConfig() []string {
	var localizeConfig LitLocalize

	jsonFile, err := ioutil.ReadFile("lit-localize.json")
	if err != nil {
		log.Fatalf("Unable to read localization configuration")
	}

	if err = json.Unmarshal(jsonFile, &localizeConfig); err != nil {
		log.Fatalf("unable to parse localization configuration")
	}

	return append([]string{localizeConfig.SourceLocale}, localizeConfig.TargetLocales...)
}
