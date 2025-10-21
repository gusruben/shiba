# Build stage
FROM python:3.11-slim AS builder

WORKDIR /src

# Install git (needed for git operations)
RUN apt-get update && \
    apt-get install -y git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.11-slim

# Install git and curl for runtime
RUN apt-get update && \
    apt-get install -y git curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/bash -m appuser

# Create app directory
WORKDIR /gitSync

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Set proper ownership
RUN chown -R appuser:appgroup /gitSync

# Create directory for temp files
RUN mkdir -p /tmp/git-clones && chown appuser:appgroup /tmp/git-clones

EXPOSE 3073
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3073/health || exit 1

CMD ["python", "server.py"]





