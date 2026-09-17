@echo off

REM Create SSL directory
if not exist ssl mkdir ssl

REM Generate private key
openssl genrsa -out ssl/server.key 2048

REM Generate certificate signing request
openssl req -new -key ssl/server.key -out ssl/server.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

REM Generate self-signed certificate
openssl x509 -req -in ssl/server.csr -signkey ssl/server.key -out ssl/server.crt -days 365

REM Clean up CSR file
del ssl\server.csr

echo SSL certificates generated successfully!
echo Files created:
echo   ssl/server.key - Private key
echo   ssl/server.crt - Certificate
echo.
echo To use HTTPS, run: npm start
echo Then visit: https://localhost:5443
echo.
echo Note: You'll need to accept the self-signed certificate warning in your browser.

pause