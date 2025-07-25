package main

import (
	"testing"
)

func TestGenerateID(t *testing.T) {
	id1 := generateID(6)
	if len(id1) != 6 {
		t.Errorf("GenerateID(6) length %d want 6", len(id1))
	}
}

// func TestRunMerge(t *testing.T) {
// 	id1 := runMerge("test.mp4", )
// }
