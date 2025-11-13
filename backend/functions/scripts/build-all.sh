#!/bin/bash
set -e
echo "🔨 Building all projects..."
npm run build -w shared
for dir in place-search image-classifier llm-analyzer data-persistence; do
  echo "Building $dir..."
  npm run build -w $dir
done
