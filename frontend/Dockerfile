

FROM nginx:alpine

# Copy frontend files
COPY operator-rig /usr/share/nginx/html/operator-rig
COPY ghost-runner /usr/share/nginx/html/ghost-runner

# Create main index that redirects to operator-rig
RUN echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ALI System</title><script>window.location.href="/operator-rig/";</script></head><body><p>Redirecting to ALI System...</p></body></html>' > /usr/share/nginx/html/index.html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
