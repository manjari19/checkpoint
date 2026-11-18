#!/usr/bin/env bash
# Runs the backend test suite inside a Java 21 Maven container, so no local Java or Maven is needed.
# Testcontainers starts PostgreSQL through the host's Docker socket.
# Extra arguments go to Maven, e.g.: scripts/test-backend.sh -Dtest=WaitlistConcurrencyTest
set -euo pipefail
cd "$(dirname "$0")/../backend"

docker run --rm \
  -v checkpoint-m2:/root/.m2 \
  -v "$PWD":/app -w /app \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  --add-host=host.docker.internal:host-gateway \
  maven:3.9-eclipse-temurin-21 \
  mvn -B verify "$@"
