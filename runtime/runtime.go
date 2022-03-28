// Yordle - A URL shortener for Google App Engine.
// Copyright (C) 2022 The Yordle Team
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

package runtime

import (
	"log"

	"github.com/qqiao/buildinfo"
)

var BuildInfo *buildinfo.BuildInfo

func init() {
	biCh, errCh := buildinfo.LoadAsync("./build_info.json")

	select {
	case err := <-errCh:
		log.Fatalf("Error loading build information: %v", err)

	case bi := <-biCh:
		BuildInfo = bi
	}
}
