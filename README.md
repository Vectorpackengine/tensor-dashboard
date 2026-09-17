# TAO Subnet Analytics Dashboard

A real-time dashboard for viewing TAO subnet metagraph data with advanced filtering and visualization features.

## Features

- Real-time TAO and Alpha price display
- Subnet metagraph data visualization
- Advanced filtering and highlighting
- Color-coded grouping by coldkey/axon
- Rate limiting and caching for API protection
- HTTPS support for secure connections

## Setup

### HTTP (Default)
```bash
npm install
npm start
```
Visit: http://localhost:5000

### HTTPS (Secure)
```bash
npm install
npm run generate-ssl
npm start
```
Visit: https://localhost:5443

## SSL Certificate Generation

### Option 1: Using npm script (Recommended)
```bash
npm run generate-ssl
```

### Option 2: Using Node.js script directly
```bash
node generate-ssl.js
```

### Option 3: Using shell script (Linux/macOS)
```bash
./generate-ssl.sh
```

### Option 4: Using batch file (Windows)
```bash
generate-ssl.bat
```

## Requirements

- Node.js 14+
- OpenSSL (for HTTPS certificate generation)

### Installing OpenSSL

**Windows:**
- Download from: https://slproweb.com/products/Win32OpenSSL.html
- Or use Chocolatey: `choco install openssl`

**macOS:**
```bash
brew install openssl
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install openssl
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install openssl
```

## Usage

1. **Start the server**: `npm start`
2. **Generate SSL certificates**: `npm run generate-ssl` (for HTTPS)
3. **Access the dashboard**: 
   - HTTP: http://localhost:5000
   - HTTPS: https://localhost:5443

## API Endpoints

- `GET /api/tao-price` - Current TAO price
- `GET /api/alpha-price` - Current Alpha price  
- `GET /api/metagraph/:netuid` - Metagraph data for specific subnet

## Security Notes

- Self-signed certificates will show a browser warning
- For production, use proper SSL certificates from a CA
- The dashboard includes rate limiting to prevent API abuse

## Browser Certificate Warning

When using HTTPS with self-signed certificates, your browser will show a security warning. This is normal for development. Click "Advanced" and "Proceed to localhost" to continue.