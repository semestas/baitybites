import { Elysia } from 'elysia';
import { oauth2 } from 'elysia-oauth2';
import { authPlugin } from '../middleware/auth';
import type { Sql } from '../db/schema';

interface GoogleUser {
    sub: string;
    name: string;
    email: string;
    picture?: string;
}

export const googleAuthRoutes = (db: Sql) => {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    /* 
    console.log('Setup Google Auth with:', {
        clientId: clientId ? clientId.substring(0, 10) : 'MISSING',
        hasSecret: !!clientSecret,
        redirectUri
    });
    */

    // Determine environment
    const isLocal = process.env.HOST === 'localhost' || process.env.NODE_ENV === 'development';

    // In production (Netlify), we treat everything as same-domain via proxy
    // Local: http://localhost:3000
    // Prod: https://baitybites.netlify.app (proxying to Render)

    const baseUrl = isLocal
        ? `http://localhost:${process.env.PORT || 3000}`
        : 'https://baitybites.netlify.app';

    // The redirect URI sent to Google must match the Proxy URL (Netlify) not Render directly
    const finalRedirectUri = `${baseUrl}/api/auth/google/callback`;

    /*
    console.log('Setup Google Auth Proxy Aware:', {
        isLocal,
        baseUrl,
        callbackUrl: finalRedirectUri
    });
    */

    return new Elysia({ prefix: '/auth' })
        .get('/version', () => ({ version: "2.0.0-netlify-proxy-fix" }))
        .use(authPlugin)
        .use(
            oauth2({
                Google: [
                    clientId || 'dummy_id',
                    clientSecret || 'dummy_secret',
                    finalRedirectUri
                ]
            }, {
                cookie: {
                    path: '/',
                    httpOnly: true,
                    // No need for explicit domain or secure=true hacks anymore
                    // because Netlify Proxy makes it same-origin
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                }
            })
        )
        .get('/google/debug', async ({ oauth2, set }) => {
            // Disable in production
            if (process.env.NODE_ENV === 'production') {
                set.status = 404;
                return { success: false, message: 'Not found' };
            }

            const url = await oauth2.createURL('Google', ['email', 'profile']);
            const currentPort = process.env.PORT || 3000;
            return {
                debug_info: "=== CONFIGURATION CHECK ===",
                server_port: currentPort,
                environment: process.env.NODE_ENV || 'development',

                // Configured values
                configured_client_id: clientId,
                computed_redirect_uri: finalRedirectUri,

                // Instructions
                google_console_instructions: {
                    step_1: "Go to Google Cloud Console > APIs & Services > Credentials",
                    step_2: "Edit your OAuth 2.0 Client ID",
                    step_3: "Ensure 'Authorized JavaScript origins' has:",
                    expected_origin: baseUrl,
                    step_4: "Ensure 'Authorized redirect URIs' has EXACTLY:",
                    expected_redirect_uri: finalRedirectUri
                },

                generated_auth_url: url.href
            };
        })
        .get('/google/login', ({ oauth2 }) => {
            return oauth2.redirect('Google', ['email', 'profile']);
        })
        .get('/google/callback', async ({ oauth2, jwt, cookie: { token }, request }) => {
            try {
                // oauth2.authorize handles state and code validation
                const googleToken = await oauth2.authorize('Google');

                // Fetch user info from Google
                const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${googleToken.accessToken()}`
                    }
                });

                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user info from Google');
                }

                const googleUser = (await userResponse.json()) as GoogleUser;

                if (!googleUser.email) {
                    throw new Error('Email not provided by Google');
                }

                // Check if customer exists
                let [customer] = await db`SELECT * FROM customers WHERE email = ${googleUser.email} LIMIT 1`;

                if (!customer) {
                    const fullName = googleUser.name;
                    // Create new customer
                    [customer] = await db`
                        INSERT INTO customers (name, email, google_id, avatar_url, auth_provider, is_verified)
                        VALUES (${fullName}, ${googleUser.email}, ${googleUser.sub}, ${googleUser.picture || null}, 'google', true)
                        RETURNING *
                    `;
                } else {
                    // Update existing customer with Google info (and update name to real Google name)
                    [customer] = await db`
                        UPDATE customers
                        SET name = ${googleUser.name},
                            google_id = COALESCE(google_id, ${googleUser.sub}),
                            avatar_url = COALESCE(avatar_url, ${googleUser.picture || null}),
                            auth_provider = 'google',
                            is_verified = true
                        WHERE id = ${customer.id}
                        RETURNING *
                    `;
                }

                if (!customer) throw new Error('Failed to create or update customer');

                // Generate JWT
                const jwtToken = await jwt.sign({
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    role: 'customer'
                });

                // Set cookie for browser-based auth
                token.set({
                    value: jwtToken,
                    httpOnly: false,
                    maxAge: 7 * 86400,
                    path: '/'
                });

                // Redirect to frontend (use configured frontend URL which is baseUrl)
                return Response.redirect(`${baseUrl}/login.html?auth=success&token=${jwtToken}`, 302);

            } catch (error) {
                console.error('Google OAuth Error:', error);

                // Detailed debug info for "State Mismatch"
                if (error instanceof Error && error.message.includes('mismatch')) {
                    console.error('Debug Mismatch - Headers:', request.headers.toJSON());
                }

                const message = (error as Error).message || 'Unknown error';
                // Add specific tip if state mismatch
                const finalMessage = message.includes('state') || message.includes('mismatch')
                    ? 'Session expired or cookie blocked. Please try again.'
                    : message;

                return Response.redirect(`${baseUrl}/login.html?auth=error&message=${encodeURIComponent(finalMessage)}`, 302);
            }
        });
};
