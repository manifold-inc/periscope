# Use the official k6 base image with Go pre-installed
FROM grafana/xk6:latest

# Set working directory
WORKDIR /app

# Install xk6 and build a custom k6 binary with extensions
RUN go install go.k6.io/xk6/cmd/xk6@latest
RUN xk6 build --with github.com/grafana/xk6-faker@latest

# Execute the custom k6 binary
ENTRYPOINT ["./k6"]
