# Fix Fingerprint Login Authentication Issue

## Problem
The Python server tries to fetch staff fingerprints from Node.js backend at `/api/staff/fingerprints`, but this endpoint requires authentication. Since fingerprint login is public (no auth yet), this creates a circular dependency.

## Solution
Modify the flow so Node.js server fetches staff fingerprints (using authenticated context) and sends them to Python server along with the scanned fingerprint.

## Tasks
- [x] Modify Node.js `fingerprintLogin` controller to fetch staff fingerprints and send to Python server
- [x] Modify Python `/identify/staff-fingerprint` endpoint to accept staff fingerprints in request body instead of fetching them
- [x] Test the fingerprint login flow
