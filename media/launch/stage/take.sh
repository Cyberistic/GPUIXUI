#!/bin/sh
# Render one film take into media/launch/takes/<name>, failing by name.
exec nub apps/playground/dist/film/takes.js "$1" "media/launch/takes/$1"
