# K6 OpenAI Testing Framework - Makefile
# Configuration variables
include .env
OPENAI_API_KEY ?= "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"
OPENAI_BASE_URL ?= "https://api.openai.com"
OPENAI_COMPLETION_MODEL ?= "gpt-4o-mini"
OPENAI_EMBEDDING_MODEL ?= "text-embedding-3-small"
OPENAI_CODING_MODEL ?= "gpt-4o-mini"
MAX_TOKENS ?= 64
VUS ?= 1
TIMEOUT ?= 5m
TIME_WAIT ?= "0s"
TIME_RAMP_UP ?= "30s" 
TIME_LOAD ?= "1m"
TIME_RAMP_DOWN ?= "30s"

# Docker compose command
DOCKER_COMPOSE = docker-compose

# Export environment variables for docker-compose
export OPENAI_API_KEY
export OPENAI_BASE_URL
export OPENAI_COMPLETION_MODEL
export OPENAI_EMBEDDING_MODEL
export OPENAI_CODING_MODEL
export MAX_TOKENS
export VUS
export TIMEOUT
export TIME_WAIT
export TIME_RAMP_UP
export TIME_LOAD
export TIME_RAMP_DOWN

# Define k6 environment variables to pass to scripts
K6_ENV_VARS = -e OPENAI_API_KEY=$(OPENAI_API_KEY) \
              -e OPENAI_BASE_URL=$(OPENAI_BASE_URL) \
              -e OPENAI_COMPLETION_MODEL=$(OPENAI_COMPLETION_MODEL) \
              -e OPENAI_EMBEDDING_MODEL=$(OPENAI_EMBEDDING_MODEL) \
              -e OPENAI_CODING_MODEL=$(OPENAI_CODING_MODEL) \
              -e MAX_TOKENS=$(MAX_TOKENS) \
              -e VUS=$(VUS) \
              -e TIME_WAIT=$(TIME_WAIT) \
              -e TIME_RAMP_UP=$(TIME_RAMP_UP) \
              -e TIME_LOAD=$(TIME_LOAD) \
              -e TIME_RAMP_DOWN=$(TIME_RAMP_DOWN)

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m # No Color

.PHONY: help setup build start stop restart test-completions test-embeddings test-batch-embeddings test-benchmark test-prefix-caching test-all logs clean purge status grafana-dashboard update-dashboards

# Default target
help:
	@echo "${YELLOW}K6 OpenAI Testing Framework${NC}"
	@echo ""
	@echo "${GREEN}Setup Commands:${NC}"
	@echo "  make setup               - Initialize directories and pull Docker images"
	@echo "  make build               - Build/rebuild all containers"
	@echo ""
	@echo "${GREEN}Control Commands:${NC}"
	@echo "  make start               - Start Grafana and InfluxDB services"
	@echo "  make stop                - Stop all services"
	@echo "  make restart             - Restart all services"
	@echo "  make status              - Check status of all services"
	@echo ""
	@echo "${GREEN}Test Commands:${NC}"
	@echo "  make test-completions    - Run OpenAI completions test"
	@echo "  make test-embeddings     - Run OpenAI single embeddings test"
	@echo "  make test-batch-embeddings - Run OpenAI batch embeddings test"
	@echo "  make test-benchmark      - Run OpenAI benchmark comparing endpoints"
	@echo "  make test-prefix-caching - Run code completion prefix caching test"
	@echo "  make test-all            - Run all tests sequentially"
	@echo ""
	@echo "${GREEN}Dashboard Commands:${NC}"
	@echo "  make grafana-dashboard   - Open Grafana dashboard in browser"
	@echo "  make update-dashboards   - Update Grafana dashboards from files"
	@echo ""
	@echo "${GREEN}Utility Commands:${NC}"
	@echo "  make logs                - Show logs from services"
	@echo "  make clean               - Stop services and remove containers"
	@echo "  make purge               - Stop services, remove containers, volumes, and data"
	@echo ""
	@echo "${GREEN}Configuration:${NC}"
	@echo "  Current settings (override with environment variables or arguments):"
	@echo "  OPENAI_API_KEY=${OPENAI_API_KEY}"
	@echo "  OPENAI_BASE_URL=${OPENAI_BASE_URL}"
	@echo "  OPENAI_COMPLETION_MODEL=${OPENAI_COMPLETION_MODEL}"
	@echo "  OPENAI_EMBEDDING_MODEL=${OPENAI_EMBEDDING_MODEL}"
	@echo "  OPENAI_CODING_MODEL=${OPENAI_CODING_MODEL}"
	@echo "  MAX_TOKENS=${MAX_TOKENS}"
	@echo "  VUS=${VUS}"
	@echo "  TIME_WAIT=${TIME_WAIT}"
	@echo "  TIME_RAMP_UP=${TIME_RAMP_UP}"
	@echo "  TIME_LOAD=${TIME_LOAD}"
	@echo "  TIME_RAMP_DOWN=${TIME_RAMP_DOWN}"
	@echo "  TIMEOUT=${TIMEOUT}"
	@echo ""
	@echo "Example: make test-completions OPENAI_API_KEY=xyz OPENAI_COMPLETION_MODEL=gpt-4"
	@echo "Note: Environment variables are passed to k6 scripts using the -e flag"

# Setup the environment
setup:
	@echo "${GREEN}Setting up environment...${NC}"
	@mkdir -p dashboards
	@mkdir -p grafana
	@echo "${GREEN}Pulling Docker images...${NC}"
	@docker pull grafana/k6:latest
	@docker pull grafana/grafana:10.2.4
	@docker pull influxdb:1.8
	@echo "${GREEN}Setup complete.${NC}"

# Build all services
build:
	@echo "${GREEN}Building services...${NC}"
	@$(DOCKER_COMPOSE) build

# Start Grafana and InfluxDB
start:
	@echo "${GREEN}Starting Grafana and InfluxDB...${NC}"
	@$(DOCKER_COMPOSE) up -d k6-grafana k6-influxdb
	@echo "${GREEN}Services started. Grafana dashboard available at: http://localhost:3000${NC}"

# Stop all services
stop:
	@echo "${GREEN}Stopping all services...${NC}"
	@$(DOCKER_COMPOSE) stop

# Restart services
restart: stop start

# Run OpenAI completions test
test-completions:
	@echo "${GREEN}Running OpenAI completions test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions.js

# Run OpenAI single embeddings test
test-embeddings:
	@echo "${GREEN}Running OpenAI single embeddings test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings.js

# Run OpenAI batch embeddings test
test-batch-embeddings:
	@echo "${GREEN}Running OpenAI batch embeddings test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-batch-embeddings.js

# Run OpenAI benchmark
test-benchmark:
	@echo "${GREEN}Running OpenAI benchmark...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-benchmark.js

# Run OpenAI prefix caching test
test-prefix-caching:
	@echo "${GREEN}Running OpenAI prefix caching test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-prefix-caching.js

# Run all tests sequentially
test-all:
	@echo "${GREEN}Running all tests sequentially...${NC}"
	@echo "${YELLOW}1. Running completions test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions.js
	@echo "${YELLOW}2. Running single embeddings test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings.js
	@echo "${YELLOW}3. Running batch embeddings test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-batch-embeddings.js
	@echo "${YELLOW}4. Running benchmark test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-benchmark.js
	@echo "${YELLOW}5. Running prefix caching test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-prefix-caching.js
	@echo "${GREEN}All tests completed.${NC}"

# OpenAI Completions Test Types
test-completions-smoke:
	@echo "${GREEN}Running OpenAI completions smoke test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-smoke.js

test-completions-stress:
	@echo "${GREEN}Running OpenAI completions stress test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-stress.js

test-completions-spike:
	@echo "${GREEN}Running OpenAI completions spike test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-spike.js

test-completions-soak:
	@echo "${GREEN}Running OpenAI completions soak test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-soak.js

test-completions-recovery:
	@echo "${GREEN}Running OpenAI completions recovery test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-recovery.js

# OpenAI Embeddings Test Types
test-embeddings-smoke:
	@echo "${GREEN}Running OpenAI embeddings smoke test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-smoke.js

test-embeddings-stress:
	@echo "${GREEN}Running OpenAI embeddings stress test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-stress.js

test-embeddings-spike:
	@echo "${GREEN}Running OpenAI embeddings spike test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-spike.js

test-embeddings-soak:
	@echo "${GREEN}Running OpenAI embeddings soak test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-soak.js

test-embeddings-recovery:
	@echo "${GREEN}Running OpenAI embeddings recovery test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-recovery.js

# Combined Test Scenarios
test-smoke-all:
	@echo "${GREEN}Running all smoke tests...${NC}"
	@echo "${YELLOW}1. Running completions smoke test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-smoke.js
	@echo "${YELLOW}2. Running embeddings smoke test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-smoke.js

test-stress-all:
	@echo "${GREEN}Running all stress tests...${NC}"
	@echo "${YELLOW}1. Running completions stress test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-stress.js
	@echo "${YELLOW}2. Running embeddings stress test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-stress.js

test-spike-all:
	@echo "${GREEN}Running all spike tests...${NC}"
	@echo "${YELLOW}1. Running completions spike test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-spike.js
	@echo "${YELLOW}2. Running embeddings spike test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-spike.js

test-soak-all:
	@echo "${GREEN}Running all soak tests...${NC}"
	@echo "${YELLOW}1. Running completions soak test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-soak.js
	@echo "${YELLOW}2. Running embeddings soak test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-soak.js

test-recovery-all:
	@echo "${GREEN}Running all recovery tests...${NC}"
	@echo "${YELLOW}1. Running completions recovery test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-recovery.js
	@echo "${YELLOW}2. Running embeddings recovery test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-embeddings-recovery.js

# OpenAI Completions Heavy Tests
test-completions-prefill-heavy:
	@echo "${GREEN}Running OpenAI completions prefill-heavy test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-prefill-heavy.js

test-completions-decode-heavy:
	@echo "${GREEN}Running OpenAI completions decode-heavy test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-decode-heavy.js

# Combined heavy tests
test-completions-heavy-all:
	@echo "${GREEN}Running all completions heavy tests...${NC}"
	@echo "${YELLOW}1. Running prefill-heavy test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-prefill-heavy.js
	@echo "${YELLOW}2. Running decode-heavy test...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/openai-completions-decode-heavy.js
	
# Show logs from services
logs:
	@echo "${GREEN}Showing logs from services...${NC}"
	@$(DOCKER_COMPOSE) logs -f

# Check status of services
status:
	@echo "${GREEN}Checking service status...${NC}"
	@$(DOCKER_COMPOSE) ps

# Open Grafana dashboard in browser
grafana-dashboard:
	@echo "${GREEN}Opening Grafana dashboard in browser...${NC}"
	@echo "URL: http://localhost:3000"
	@if command -v xdg-open > /dev/null; then \
		xdg-open http://localhost:3000; \
	elif command -v open > /dev/null; then \
		open http://localhost:3000; \
	else \
		echo "${RED}Could not open browser automatically. Please open http://localhost:3000 manually.${NC}"; \
	fi

# Update Grafana dashboards from files
update-dashboards:
	@echo "${GREEN}Updating Grafana dashboards...${NC}"
	@echo "This will restart the Grafana service."
	@$(DOCKER_COMPOSE) restart k6-grafana
	@echo "${GREEN}Dashboards updated.${NC}"

# Clean up (stop and remove containers)
clean:
	@echo "${GREEN}Cleaning up...${NC}"
	@$(DOCKER_COMPOSE) down
	@echo "${GREEN}Services stopped and containers removed.${NC}"

# Complete purge (remove containers, volumes, and data)
purge:
	@echo "${RED}WARNING: This will remove all containers, volumes, and data.${NC}"
	@echo "${RED}Are you sure you want to continue? [y/N]${NC}"
	@read -r response; \
	if [ "$$response" = "y" ] || [ "$$response" = "Y" ]; then \
		echo "${GREEN}Purging...${NC}"; \
		$(DOCKER_COMPOSE) down -v; \
		echo "${GREEN}Purge complete.${NC}"; \
	else \
		echo "${GREEN}Purge cancelled.${NC}"; \
	fi

# Run a custom test script
test:
	@if [ -z "$(script)" ]; then \
		echo "${RED}Error: No script specified. Usage: make test script=your-script.js${NC}"; \
		exit 1; \
	fi
	@echo "${GREEN}Running test script: $(script)...${NC}"
	@$(DOCKER_COMPOSE) run --rm k6 run $(K6_ENV_VARS) /scripts/$(script)
