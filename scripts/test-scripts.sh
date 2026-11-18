#!/usr/bin/env bash
# Runs the tests for the Python scripts inside Docker (never a local Python install).
set -euo pipefail
cd "$(dirname "$0")"
docker run --rm -v "$PWD":/scripts:ro -w /scripts -e PYTHONDONTWRITEBYTECODE=1 python:3.13.18-alpine \
  python -m unittest discover -s tests -v
