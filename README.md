<br />
<div align="center">
  <a href="https://github.com/wizenheimer/periscope">
  </a>

  <h3 align="center">Periscope</h3>

  <p align="center">
    Periscope K6 LLM Performance Testing Framework
    <br />
    <a href="https://github.com/wizenheimer/periscope/README.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/wizenheimer/periscope/scripts">View Scripts</a>
    &middot;
    <a href="https://github.com/wizenheimer/periscope/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/wizenheimer/periscope/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>

[![OpenAI Compatible](https://img.shields.io/badge/OpenAI-Compatible-brightgreen.svg)](https://openai.com/)
[![K6](https://img.shields.io/badge/K6-Framework-blue.svg)](https://k6.io/)
[![Docker](https://img.shields.io/badge/Docker-Container-blue.svg)](https://www.docker.com/)

A comprehensive framework for load testing and benchmarking OpenAI API endpoints using K6, with a focus on measuring performance metrics for completions and embeddings.

![Grafana Dashboard Preview](/assets/dashboard.png)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Architecture](#architecture)
- [Usage](#usage)
- [Makefile Reference](#makefile-reference)
- [Configuration Options](#configuration-options)
- [Example Workflows](#example-workflows)
- [Scripts Explained](#scripts-explained)
- [Custom Tests](#custom-tests)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)
- [License](#license)

## Overview

This framework provides a Docker-based environment for performance testing of OpenAI API endpoints. It includes preconfigured K6, InfluxDB, and Grafana services, along with customized scripts designed specifically for testing various aspects of OpenAI's API services. The framework allows you to measure key metrics like response times, token usage efficiency, throughput, and error rates under different load scenarios.

## Features

- **Containerized Environment**: Docker and Docker Compose based deployment
- **Metrics Visualization**: Pre-configured Grafana dashboards for test results
- **Core API Testing**:
  - Chat completions testing
  - Embeddings generation testing (single and batch)
  - Code completion with prefix caching
- **Performance Testing Patterns**:
  - Smoke tests for basic functionality validation
  - Stress tests for identifying breaking points
  - Spike tests for sudden load surges
  - Soak tests for long-duration stability
  - Recovery tests for measuring system stabilization
  - Prefill-heavy tests for context processing efficiency
  - Decode-heavy tests for output generation throughput
- **Extensible Framework**: Modular design for custom test script creation
- **Comprehensive Metrics**: Token usage, latency, throughput, and processing rates
- **Automated Workflows**: Makefile-based command system for test management

## Prerequisites

- Docker and Docker Compose
- OpenAI API Key
- Bash or compatible shell environment

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/wizenheimer/periscope.git
   cd periscope
   ```

2. Initialize the environment:

   ```bash
   make setup
   ```

3. Start the infrastructure services:

   ```bash
   make start
   ```

4. Verify services are running:
   ```bash
   make status
   ```

## Architecture

The framework consists of three main components:

1. **K6**: Open-source load testing tool that executes the test scripts
2. **InfluxDB**: Time-series database that stores test metrics
3. **Grafana**: Visualization platform that displays real-time and historical test results

These components are orchestrated using Docker Compose, with configuration files for seamless integration.

### Directory Structure

```
k6-openai-testing/
├── docker-compose.yaml    # Container orchestration
├── Makefile               # Simplified command interface
├── grafana/               # Grafana configuration
│   ├── grafana-dashboard.yaml
│   ├── grafana-datasource.yaml
├── dashboards/            # Dashboard templates
│   ├── k6-load-testing-results_rev3.json
│   └── k6-openai-tokens_rev1.json
├── scripts/               # Test scripts
│   ├── config.js          # Shared configuration
│   ├── openai-completions.js
│   ├── openai-embeddings.js
│   ├── openai-benchmark.js
│   ├── openai-prefix-caching.js
│   ├── helpers/           # Utilities
│   │   ├── openaiGeneric.js
│   │   ├── utils.js
│   │   └── http.js
│   └── payloads/          # Request templates
│       ├── completions.js
│       └── embeddings.js
└── README.md
```

## Usage

### Basic Usage

1. Set your OpenAI API key:

   ```bash
   export OPENAI_API_KEY=your_api_key
   ```

2. Run a test:

   ```bash
   make test-completions
   ```

3. View results:
   ```bash
   make grafana-dashboard
   ```

### Running Different Tests

The framework includes several specialized test scripts:

```bash
# Test chat completions
make test-completions

# Test embedding generation
make test-embeddings

# Test code completion with prefix caching
make test-prefix-caching

# Run comprehensive benchmark
make test-benchmark

# Run all tests sequentially
make test-all
```

## Makefile Reference

### Basic Setup and Operation

```bash
# Initial setup
make setup

# Start services
make start

# Check status
make status

# Open Grafana dashboard
make grafana-dashboard
```

### Running Tests

```bash
# Set your OpenAI API key (replace with your actual key)
export OPENAI_API_KEY=sk-your-api-key

# Run completions test
make test-completions

# Run embeddings test
make test-embeddings

# Run benchmark test
make test-benchmark

# Run prefix caching test
make test-prefix-caching

# Run all tests sequentially
make test-all

# Run a specific script
make test script=custom-script.js
```

### Configuration Options

You can override any configuration option either through environment variables or by passing them as arguments:

```bash
# Override with environment variables
export OPENAI_COMPLETION_MODEL=gpt-4
make test-completions

# Or pass directly as arguments
make test-completions OPENAI_COMPLETION_MODEL=gpt-4 MAX_TOKENS=128
```

### Maintenance

```bash
# View logs
make logs

# Restart services
make restart

# Stop services
make stop

# Clean up (stop and remove containers)
make clean

# Full purge (remove containers, volumes, and data)
make purge
```

### Getting Help

```bash
# Show all available commands and configuration
make help
```

## Configuration Options

| Option                    | Description                        | Default                  |
| ------------------------- | ---------------------------------- | ------------------------ |
| `OPENAI_API_KEY`          | Your OpenAI API key                | "your-api-key-here"      |
| `OPENAI_BASE_URL`         | Base URL for OpenAI API            | "https://api.openai.com" |
| `OPENAI_COMPLETION_MODEL` | Model for completion requests      | "gpt-3.5-turbo"          |
| `OPENAI_EMBEDDING_MODEL`  | Model for embedding requests       | "text-embedding-3-small" |
| `OPENAI_CODING_MODEL`     | Model for code completion requests | "gpt-3.5-turbo"          |
| `MAX_TOKENS`              | Maximum tokens to generate         | 64                       |
| `VUS`                     | Number of virtual users            | 1                        |
| `ENABLE_BATCH_MODE`       | Enable batch embedding requests    | "false"                  |

## Example Workflows

### Testing Model Performance

Compare performance metrics between different models:

```bash
# Test with GPT-3.5 Turbo
make test-completions OPENAI_COMPLETION_MODEL=gpt-3.5-turbo

# Test with GPT-4
make test-completions OPENAI_COMPLETION_MODEL=gpt-4
```

### Load Testing

Test how the API performs under increased load:

```bash
# Test with 1 virtual user
make test-completions VUS=1

# Test with 5 virtual users
make test-completions VUS=5
```

### Testing with Different Input Sizes

Test how input size affects performance:

```bash
# Test with default token limit
make test-prefix-caching MAX_TOKENS=16

# Test with larger token limit
make test-prefix-caching MAX_TOKENS=128
```

### Testing Alternative API Endpoints

Test against a compatible alternative API:

```bash
make test-completions OPENAI_BASE_URL=https://alternative-api.example.com
```

## Scripts Explained

### openai-completions.js

Tests the chat completions endpoint with various prompts. Measures response time, token usage, and generation throughput.

### openai-embeddings.js

Tests the embeddings endpoint for single text embedding requests. Measures embedding generation latency and tracks vector dimensions for individual text items.

### openai-batch-embeddings.js

Tests the embeddings endpoint specifically for batch processing (multiple texts in a single request). Measures batch processing efficiency, per-text latency, and compares performance across different batch sizes.

### openai-prefix-caching.js

Simulates an IDE-like code completion scenario where each completion is appended to the prefix for the next request. Tests continuous usage patterns and measures token efficiency.

### openai-benchmark.js

Comprehensive benchmark that tests both completions and embeddings endpoints with increasing numbers of virtual users. Provides comparative performance metrics.

## Custom Tests

You can easily create custom test scripts by using the provided helpers and utilities:

1. Create a new JavaScript file in the `scripts` directory:

   ```javascript
   // scripts/my-custom-test.js
   import * as oai from "./helpers/openaiGeneric.js";
   import config from "./config.js";

   export const options = {
     vus: 1,
     duration: "30s",
   };

   const client = oai.createClient({
     url: config.openai.url,
     options: {
       model: "gpt-3.5-turbo",
     },
     headers: {
       Authorization: `Bearer ${config.openai.key}`,
     },
   });

   export default function () {
     const response = client.chatComplete({
       messages: [
         {
           role: "user",
           content: "Generate a random number between 1 and 100",
         },
       ],
     });

     console.log(oai.getContent(response));
   }
   ```

2. Run your custom test:
   ```bash
   make test script=my-custom-test.js
   ```

## Specialized Performance Test Scripts

The framework includes a comprehensive set of specialized test scripts for different performance testing scenarios:

### Test Types

1. **Smoke Tests** - Basic functionality verification with minimal load

   ```bash
   make test-completions-smoke
   make test-embeddings-smoke
   make test-smoke-all
   ```

2. **Stress Tests** - Testing system behavior under high load to find breaking points

   ```bash
   make test-completions-stress
   make test-embeddings-stress
   make test-stress-all
   ```

3. **Spike Tests** - Testing system reaction to sudden, dramatic increases in load

   ```bash
   make test-completions-spike
   make test-embeddings-spike
   make test-spike-all
   ```

4. **Soak Tests** - Long-duration testing to identify issues that appear over time

   ```bash
   make test-completions-soak
   make test-embeddings-soak
   make test-soak-all
   ```

5. **Recovery Tests** - Testing how the system recovers after failure or high load
   ```bash
   make test-completions-recovery
   make test-embeddings-recovery
   make test-recovery-all
   ```

### Test Patterns Explained

- **Smoke Tests**: Minimal load (1 VU, few iterations) to verify basic functionality is working correctly before running more intensive tests.

- **Stress Tests**: Gradually increasing load until performance degradation or failures occur, to identify maximum operational capacity.

- **Spike Tests**: Sudden jumps to high user counts, then returning to baseline, to evaluate how the API handles unexpected traffic surges.

- **Soak Tests**: Moderate but consistent load maintained for extended periods, to catch issues that only appear over time (memory leaks, gradual degradation).

- **Recovery Tests**: High load followed by a return to normal levels, to measure how quickly the system stabilizes after stress.

### Recommended Testing Sequence

For a comprehensive evaluation of the API's performance characteristics:

1. Start with smoke tests to verify basic functionality
2. Run stress tests to identify performance limits
3. Run spike tests to assess resilience to sudden load
4. Run recovery tests to measure stabilization capabilities
5. Run soak tests to verify long-term stability

### Customizing Test Duration

For soak tests and other long-running tests, you may want to modify the duration:

```bash
# Edit the test file to change the duration settings
# Or pass duration parameters as environment variables
SOAK_DURATION=60m make test-completions-soak
```

### Interpreting Test Results

Each specialized test outputs different metrics relevant to its test pattern:

- **Smoke Tests**: Basic response validation and error rates
- **Stress Tests**: Identifies breaking points and maximum throughput
- **Spike Tests**: Measures failure rates during load spikes and recovery times
- **Soak Tests**: Tracks performance stability over time and error accumulation
- **Recovery Tests**: Measures stabilization time after stress periods

All these metrics are visualized in the Grafana dashboard for easy analysis.

## Specialized Heavy Workload Tests

The framework includes specialized tests designed to evaluate performance under different workload patterns:

### Prefill-Heavy Tests

Prefill-heavy tests focus on scenarios with large input contexts but relatively shorter outputs. These tests evaluate how effectively the model processes and understands extensive context.

```bash
make test-completions-prefill-heavy
```

This test simulates:

- Long document analysis
- Multi-turn conversations with extensive history
- Complex questions requiring deep context understanding
- Legal documents, research papers, or literature analysis

Key metrics:

- Prefill processing time
- Token processing rate (tokens/second)
- Performance with increasing context size

### Decode-Heavy Tests

Decode-heavy tests focus on scenarios that require generating lengthy, detailed outputs from relatively concise prompts. These tests evaluate the model's token generation speed and throughput.

```bash
make test-completions-decode-heavy
```

This test simulates:

- Detailed explanations and tutorials
- Creative writing tasks
- Comprehensive guides and analyses
- Step-by-step instructions

Key metrics:

- Output generation time
- Token generation rate (tokens/second)
- Performance with varying output lengths

### Running All Heavy Tests

To run both types of heavy workload tests:

```bash
make test-completions-heavy-all
```

### Customizing Heavy Tests

You can customize these tests with environment variables:

```bash
# Set maximum output tokens for decode-heavy test
MAX_OUTPUT_TOKENS=2000 make test-completions-decode-heavy

# Use a specific model for heavy tests
OPENAI_COMPLETION_MODEL=gpt-4 make test-completions-heavy-all
```

### Use Cases

These specialized tests are particularly valuable for:

1. **Model Comparison**: Compare how different models handle prefill vs. decode tasks
2. **Pricing Optimization**: Understand performance tradeoffs between models to optimize cost
3. **Application Design**: Make informed decisions about prompt design based on performance characteristics
4. **Resource Planning**: Plan infrastructure based on expected workload patterns

## Troubleshooting

### Common Issues

1. **API Connection Errors**

   - Verify your API key is correct
   - Check if you're hitting rate limits
   - Ensure your network allows connections to the OpenAI API

2. **Container Issues**

   - Try restarting the services: `make restart`
   - Check logs for errors: `make logs`
   - Verify Docker is running properly

3. **Grafana Dashboard Not Showing Data**
   - Ensure InfluxDB is running: `make status`
   - Verify tests are outputting data to InfluxDB
   - Try restarting Grafana: `docker-compose restart k6-grafana`

## Advanced Usage

### Custom Load Patterns

K6 supports various load patterns that can be defined in your test scripts:

```javascript
export const options = {
  // Ramping pattern
  stages: [
    { duration: "1m", target: 5 }, // Ramp up to 5 VUs
    { duration: "3m", target: 5 }, // Stay at 5 VUs
    { duration: "1m", target: 0 }, // Ramp down to 0 VUs
  ],

  // Or use fixed VUs
  // vus: 10,
  // duration: '5m',
};
```

### Capturing Custom Metrics

You can define custom metrics in your test scripts:

```javascript
import { Trend } from "k6/metrics";

// Define custom metrics
const promptLength = new Trend("prompt_length");
const responseLength = new Trend("response_length");

export default function () {
  // Your test logic

  // Record metrics
  promptLength.add(prompt.length);
  responseLength.add(response.length);
}
```

### Testing with Thresholds

Define pass/fail criteria for your tests:

```javascript
export const options = {
  thresholds: {
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    http_req_failed: ["rate<0.01"], // Error rate must be less than 1%
  },
};
```

## License

This project is licensed under the MIT License and is provided "as is" and comes with absolutely no guarantees. If it breaks your system, well, that's kind of the point, isn't it? Congratulations, you're now doing perf testing!

Use at your own risk. Side effects may include improved system resilience, fewer 3 AM panic attacks, and an irresistible urge to push big red buttons.

## Credits

Consider this as my small act of rebellion against the "just eyeball the performance" approach to perf testing. Feel free to star the repo - each star will be printed and taped to my manager's door.

- A Developer With Too Much Time and Not Enough Approval
