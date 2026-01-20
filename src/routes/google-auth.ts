import { Elysia, t } from 'elysia';
import { oauth2 } from 'elysia-oauth2';
import { authPlugin } from '../middleware/auth';
import type { Sql } from '../db/schema';

interface GoogleUser {
    sub: string;
    name: string;
    email: string;
    picture?: string;
}

const DEPLOY_VERSION = "1.1.0-fix-oauth";

export const googleAuthRoutes = (db: Sql) =>
    new Elysia({ prefix: '/auth' })
        .get('/version', () => ({ version: DEPLOY_VERSION }))
        .use(authPlugin)
        .use(
            oauth2({
                Google: [
                    process.env.GOOGLE_CLIENT_ID || 'dummy_id',
                    process.env.GOOGLE_CLIENT_SECRET || 'dummy_secret',
                    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:9876/api/auth/google/callback'
                ]
            })
        )
        .get('/google/login', async ({ oauth2 }) => {
            // @ts-ignore
            const url = await oauth2.authorize('Google', ['email', 'profile']);
            if (!url) throw new Error('Failed to generate Google Auth URL');
            return Response.redirect(url.toString(), 302);
        })
        .get('/google/callback', async ({ oauth2, query, jwt, cookie: { token } }) => {
            try {
                const code = query.code;
                const state = query.state;

                if (!code) throw new Error('No code provided from Google');

                // @ts-ignore - The plugin adds validate to oauth2 context
                const googleToken = await oauth2.validate('Google', code, state);

                // Fetch user info from Google
                const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                        Authorization: `Bearer ${googleToken.accessToken}`
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
                    // Create new customer
                    [customer] = await db`
                        INSERT INTO customers (name, email, google_id, avatar_url, auth_provider, is_verified)
                        VALUES (${googleUser.name}, ${googleUser.email}, ${googleUser.sub}, ${googleUser.picture || null}, 'google', true)
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

                // Redirect to frontend
                return Response.redirect('/login.html?auth=success&token=' + jwtToken, 302);

            } catch (error) {
                console.error('Google OAuth Error:', error);
                const message = (error as Error).message || 'Unknown error';
                return Response.redirect('/login.html?auth=error&message=' + encodeURIComponent(message), 302);
            }
        });
