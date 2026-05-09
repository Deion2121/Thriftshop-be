// middleware/security.js
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

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

export const securityMiddleware = (app) => {
    // Set security-related HTTP headers
    app.use(helmet());

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

    //disable x-powered-by header
    app.disable('x-powered-by');
};

