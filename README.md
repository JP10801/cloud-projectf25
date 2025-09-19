# Filedrop — Express + Handlebars web file store

This project implements a small web file store with:

- Drag & drop + multi-file upload
- Automatic foldering by file extension or mime type
- Dynamic folder & rule creation (stored in storage/rules.json)
- Search by name and sorting by name/created/accessed/size
- Simple local Passport authentication (USERNAME & PASSWORD env vars)

## Quick run

1. Install dependencies:
   ```
   npm install
   ```

2. Create storage dir (if not using a cloud platform):
   ```
   mkdir storage
   ```

3. Set environment variables:
   ```
   export PERSISTENT_STORAGE_DIR=$(pwd)/storage
   export USERNAME=you
   export PASSWORD=secret
   export SESSION_SECRET=verysecret
   ```

4. Start:
   ```
   npm start
   ```

5. Visit http://localhost:3000 and log in.

## Notes

- This is an example. For production, use a proper user database, CSRF protection, file sanitization, virus scanning, and storage such as S3 or equivalent.
