#!/bin/bash

# Create SSL directory
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/server.key 2048

# Generate certificate signing request
openssl req -new -key ssl/server.key -out ssl/server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -days 365

# Clean up CSR file
rm ssl/server.csr

echo "SSL certificates generated successfully!"
echo "Files created:"
echo "  ssl/server.key - Private key"
echo "  ssl/server.crt - Certificate"
echo ""
echo "To use HTTPS, run: npm start"
echo "Then visit: https://localhost:5443"
echo ""
echo "Note: You'll need to accept the self-signed certificate warning in your browser."