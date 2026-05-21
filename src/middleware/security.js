// middleware/security.js
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;

    try {
        const { protocol, hostname } = new URL(origin);
        const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);

        return process.env.NODE_ENV !== 'production' &&
            ['http:', 'https:'].includes(protocol) &&
            isLocalHost;
    } catch {
        return false;
    }
};

const getCsrfSecret = () => process.env.CSRF_SECRET || process.env.JWT_SECRET;

const signCsrfToken = (nonce) => {
    const secret = getCsrfSecret();
    if (!secret) {
        throw new Error('CSRF_SECRET or JWT_SECRET must be configured');
    }

    return crypto.createHmac('sha256', secret).update(nonce).digest('hex');
};

export const createCsrfToken = () => {
    const nonce = crypto.randomBytes(24).toString('hex');
    return `${nonce}.${signCsrfToken(nonce)}`;
};

export const csrfCookieOptions = {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
};

export const verifyCsrfToken = (token) => {
    if (!token || typeof token !== 'string') return false;

    const [nonce, signature] = token.split('.');
    if (!nonce || !signature) return false;

    const expected = signCsrfToken(nonce);
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expected, 'hex');

    return signatureBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

export const csrfProtection = (req, res, next) => {
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (!unsafeMethod) return next();

    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.get('x-csrf-token');

    if (!cookieToken || !headerToken || cookieToken !== headerToken || !verifyCsrfToken(cookieToken)) {
        return res.status(403).json({ message: 'Invalid CSRF token' });
    }

    next();
};

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const checkoutRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { message: 'Too many checkout attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const trackingRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { message: 'Too many tracking requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

export const securityMiddleware = (app) => {
    // Set security-related HTTP headers
    app.disable('x-powered-by');

    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                mediaSrc: ["'self'"],
                connectSrc: ["'self'", ...allowedOrigins],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"],
            },
        },
    }));

    app.use(cors({
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }

            return callback(null, false);
        },
        credentials: true,
        optionsSuccessStatus: 200
    }));

    // Rate limiting to prevent brute-force attacks
    app.use(rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    }));
};
