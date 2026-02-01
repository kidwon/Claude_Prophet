// Prophet Trader Configuration Service
// Cloudflare Worker to securely serve configuration from Secrets Store

export default {
    async fetch(request, env) {
        // Only allow POST requests for security
        if (request.method !== 'POST') {
            return new Response('Method Not Allowed', { status: 405 });
        }

        // Verify authorization token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response('Unauthorized: Missing or invalid Authorization header', {
                status: 401
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Validate token against secret
        if (token !== env.CONFIG_ACCESS_TOKEN) {
            return new Response('Unauthorized: Invalid token', { status: 401 });
        }

        // Return all configuration from secrets
        const config = {
            ALPACA_API_KEY: env.ALPACA_API_KEY,
            ALPACA_SECRET_KEY: env.ALPACA_SECRET_KEY,
            ALPACA_BASE_URL: env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
            ALPACA_ENDPOINT: env.ALPACA_ENDPOINT || 'https://paper-api.alpaca.markets/v2',
            ALPACA_PAPER: env.ALPACA_PAPER || 'true',
            GEMINI_API_KEY: env.GEMINI_API_KEY,
            DATABASE_PATH: env.DATABASE_PATH || './data/prophet_trader.db',
            SERVER_PORT: env.SERVER_PORT || '4534',
            ENABLE_LOGGING: env.ENABLE_LOGGING || 'true',
            LOG_LEVEL: env.LOG_LEVEL || 'info'
        };

        return new Response(JSON.stringify(config), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type'
            }
        });
    }
};
