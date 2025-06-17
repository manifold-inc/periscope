# K6 OpenAI Testing Framework - Justfile

# Configuration constants
set dotenv-load := true

# API Configuration
OPENAI_API_KEY := "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"
OPENAI_BASE_URL := "https://api.openai.com"
OPENAI_COMPLETION_MODEL := "gpt-4o-mini"
OPENAI_EMBEDDING_MODEL := "text-embedding-3-small"
OPENAI_CODING_MODEL := "gpt-4o-mini"
MAX_TOKENS := "64"
VUS := "1"
TIMEOUT := "5m"
TIME_WAIT := "0s"
TIME_RAMP_UP := "30s"
TIME_LOAD := "1m"
TIME_RAMP_DOWN := "30s"

# Docker compose command
docker_compose := "docker-compose"

# Define k6 environment variables to pass to scripts
k6_env_vars := "-e OPENAI_API_KEY=" + OPENAI_API_KEY + " " + \
               "-e OPENAI_BASE_URL=" + OPENAI_BASE_URL + " " + \
               "-e OPENAI_COMPLETION_MODEL=" + OPENAI_COMPLETION_MODEL + " " + \
               "-e OPENAI_EMBEDDING_MODEL=" + OPENAI_EMBEDDING_MODEL + " " + \
               "-e OPENAI_CODING_MODEL=" + OPENAI_CODING_MODEL + " " + \
               "-e MAX_TOKENS=" + MAX_TOKENS + " " + \
               "-e VUS=" + VUS + " " + \
               "-e TIME_WAIT=" + TIME_WAIT + " " + \
               "-e TIME_RAMP_UP=" + TIME_RAMP_UP + " " + \
               "-e TIME_LOAD=" + TIME_LOAD + " " + \
               "-e TIME_RAMP_DOWN=" + TIME_RAMP_DOWN

# Default recipe
default:
    @just --list

# Setup the environment
setup:
    #!/usr/bin/env bash
    echo "Setting up environment..."
    mkdir -p dashboards
    mkdir -p grafana
    echo "Pulling Docker images..."
    docker pull grafana/k6:latest
    docker pull grafana/grafana:10.2.4
    docker pull influxdb:1.8
    echo "Setup complete."

# Build all services
build:
    #!/usr/bin/env bash
    echo "Building services..."
    {{docker_compose}} build

# Start Grafana and InfluxDB
start:
    #!/usr/bin/env bash
    echo "Starting Grafana and InfluxDB..."
    {{docker_compose}} up -d k6-grafana k6-influxdb
    echo "Services started. Grafana dashboard available at: http://localhost:3000"

# Stop all services
stop:
    #!/usr/bin/env bash
    echo "Stopping all services..."
    {{docker_compose}} stop

# Restart services
restart: stop start

# Run OpenAI completions test
test-completions:
    #!/usr/bin/env bash
    echo "Running OpenAI completions test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-completions.js

# Run OpenAI single embeddings test
test-embeddings:
    #!/usr/bin/env bash
    echo "Running OpenAI single embeddings test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-embeddings.js

# Run OpenAI batch embeddings test
test-batch-embeddings:
    #!/usr/bin/env bash
    echo "Running OpenAI batch embeddings test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-batch-embeddings.js

# Run OpenAI benchmark
test-benchmark:
    #!/usr/bin/env bash
    echo "Running OpenAI benchmark..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-benchmark.js

# Run OpenAI prefix caching test
test-prefix-caching:
    #!/usr/bin/env bash
    echo "Running OpenAI prefix caching test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-prefix-caching.js

# Run all tests sequentially
test-all:
    #!/usr/bin/env bash
    echo "Running all tests sequentially..."
    echo "1. Running completions test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-completions.js
    echo "2. Running single embeddings test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-embeddings.js
    echo "3. Running batch embeddings test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-batch-embeddings.js
    echo "4. Running benchmark test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-benchmark.js
    echo "5. Running prefix caching test..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/openai-prefix-caching.js
    echo "All tests completed."

# Show logs from services
logs:
    #!/usr/bin/env bash
    echo "Showing logs from services..."
    {{docker_compose}} logs -f

# Check status of services
status:
    #!/usr/bin/env bash
    echo "Checking service status..."
    {{docker_compose}} ps

# Open Grafana dashboard in browser
grafana-dashboard:
    #!/usr/bin/env bash
    echo "Opening Grafana dashboard in browser..."
    echo "URL: http://localhost:3000"
    if command -v xdg-open > /dev/null; then
        xdg-open http://localhost:3000
    elif command -v open > /dev/null; then
        open http://localhost:3000
    else
        echo "Could not open browser automatically. Please open http://localhost:3000 manually."
    fi

# Update Grafana dashboards from files
update-dashboards:
    #!/usr/bin/env bash
    echo "Updating Grafana dashboards..."
    echo "This will restart the Grafana service."
    {{docker_compose}} restart k6-grafana
    echo "Dashboards updated."

# Clean up (stop and remove containers)
clean:
    #!/usr/bin/env bash
    echo "Cleaning up..."
    {{docker_compose}} down
    echo "Services stopped and containers removed."

# Complete purge (remove containers, volumes, and data)
purge:
    #!/usr/bin/env bash
    echo "WARNING: This will remove all containers, volumes, and data."
    read -p "Are you sure you want to continue? [y/N] " response
    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        echo "Purging..."
        {{docker_compose}} down -v
        echo "Purge complete."
    else
        echo "Purge cancelled."
    fi

# Run a custom test script
test script:
    #!/usr/bin/env bash
    if [ -z "{{script}}" ]; then
        echo "Error: No script specified. Usage: just test your-script.js"
        exit 1
    fi
    echo "Running test script: {{script}}..."
    {{docker_compose}} run --rm k6 run {{k6_env_vars}} /scripts/{{script}} 