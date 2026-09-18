# LEGACY: not validated for the current Node + Rasa + PostgreSQL pilot.
# Use docs/PILOT_DEPLOYMENT.md instead. This file expects a missing root
# requirements.txt and does not build the Node frontend/backend.

# Build stage
FROM python:3.9-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.9-slim

# Create non-root user for security
RUN groupadd -r rasa && useradd -r -g rasa rasa

# Set working directory
WORKDIR /app

# Copy Python dependencies from builder stage
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads models data/backup

# Set ownership
RUN chown -R rasa:rasa /app

# Switch to non-root user
USER rasa

# Expose port
EXPOSE 5005

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5005/ || exit 1

# Default command
CMD ["python", "scripts/start.py", "--env", "production", "--mode", "both"]

# Labels for metadata
LABEL maintainer="BukSU ICT Team"
LABEL version="1.0.0"
LABEL description="BukSU Chatbot with Rasa"
