# ListingLaunch AI Full SaaS

This is a real full-stack app project for ListingLaunch AI.

## What Is Included

- `server.js`: Node.js server and API
- `public/`: browser client
- `data/db.json`: file-based database
- `package.json`: project metadata

## What Works

- user registration
- user login and logout
- server-side sessions with cookies
- saved brand profile
- plan selection and plan limits
- listing CRUD
- listing duplication
- server-side asset generation
- editable marketing assets
- bundle export
- persistent storage in `data/db.json`

## How To Run

1. Open a terminal in this folder.
2. Run:

```bash
node server.js
```

3. Open:

```text
http://localhost:8787
```

## Important Note

This is a full-stack local app. It does not yet include:

- Stripe payments
- email delivery providers
- SMS delivery providers
- real OpenAI API generation
- cloud database hosting

Those require external services and credentials.
