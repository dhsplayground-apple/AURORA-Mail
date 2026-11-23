const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// PRODUCTION SKELETON ONLY:
// - Add your authentication middleware before every route.
// - Store refresh tokens encrypted at rest, keyed per authenticated user.
// - Use IMAP/SMTP libraries (for example, imapflow/nodemailer) on the server.
// - Never accept raw mailbox passwords from the Expo app.
// - Apply CSRF, rate limiting, TLS, audit logging, and provider-specific consent checks.

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.AURORA_ALLOWED_ORIGINS?.split(',') ?? [] }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/mail/unified', (_req, res) => res.status(501).json({ error: 'Implement authenticated provider aggregation' }));
app.post('/api/mail/fastHost/connect', (_req, res) => res.status(501).json({ error: 'Implement OAuth-equivalent FastHost credential exchange in the backend' }));
app.post('/api/mail/send', (_req, res) => res.status(501).json({ error: 'Implement authenticated send routing' }));
app.patch('/api/mail/:provider/:id', (_req, res) => res.status(501).json({ error: 'Implement authenticated mailbox mutation' }));

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`AURORA backend listening on ${port}`));
