import { Elysia, t } from 'elysia';
import { authPlugin } from '../middleware/auth';
import type { Sql } from '../db/schema';

export const authRoutes = (db: Sql) =>
    new Elysia({ prefix: '/auth' })
        .use(authPlugin)
        .post('/login', async ({ body, jwt, set }) => {
            // ... login logic ...
            // We need jwt here to sign. authPlugin provides jwt via jwtConfig.
            const { username, password } = body;

            // Cari user di database
            const [user] = await db`SELECT * FROM users WHERE username = ${username}`;

            if (!user) {
                set.status = 401;
                return { success: false, message: 'Username atau password salah' };
            }

            // Verifikasi password
            const isPasswordValid = await Bun.password.verify(password, user.password);

            if (!isPasswordValid) {
                set.status = 401;
                return { success: false, message: 'Username atau password salah' };
            }

            // Generate token
            const token = await jwt.sign({
                id: user.id,
                username: user.username,
                role: user.role
            });

            return {
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        role: user.role
                    }
                }
            };
        }, {
            body: t.Object({
                username: t.String(),
                password: t.String()
            })
        })
        .get('/me', async (context: any) => {
            const { user, set } = context;
            if (!user) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            // If it's a customer, fetch more info
            if (user.role === 'customer') {
                const [customer] = await db`SELECT * FROM customers WHERE id = ${user.id}`;
                return { success: true, data: { ...user, ...customer } };
            }

            return { success: true, data: user };
        })
        // Mock Google Login for Demonstration
        .post('/google', async ({ body, jwt, set }) => {
            const { email, name, google_id, avatar_url } = body as any;

            try {
                // Upsert customer
                let [customer] = await db`SELECT * FROM customers WHERE email = ${email}`;

                if (customer) {
                    [customer] = await db`
                        UPDATE customers 
                        SET name = ${name}, google_id = ${google_id}, avatar_url = ${avatar_url}
                        WHERE email = ${email}
                        RETURNING *
                    `;
                } else {
                    [customer] = await db`
                        INSERT INTO customers (name, email, google_id, avatar_url)
                        VALUES (${name}, ${email}, ${google_id}, ${avatar_url})
                        RETURNING *
                    `;
                }

                if (!customer) throw new Error('Customer creation failed');

                const token = await jwt.sign({
                    id: customer.id,
                    email: customer.email,
                    name: customer.name,
                    role: 'customer',
                    is_google: true
                });

                return {
                    success: true,
                    data: {
                        token,
                        user: {
                            id: customer.id,
                            name: customer.name,
                            email: customer.email,
                            role: 'customer',
                            avatar_url: customer.avatar_url,
                            address: customer.address,
                            phone: customer.phone
                        }
                    }
                };
            } catch (error) {
                console.error('Google login error:', error);
                set.status = 500;
                return { success: false, message: 'Gagal login dengan Google' };
            }
        }, {
            body: t.Object({
                email: t.String(),
                name: t.String(),
                google_id: t.String(),
                avatar_url: t.Optional(t.String())
            })
        })
        // Guest Login - Just returns a token identifying them as a guest
        // This is useful if we want to track their session temporarily
        .post('/guest', async ({ jwt }) => {
            const token = await jwt.sign({
                role: 'guest',
                name: 'Guest User',
                id: 0
            });

            return {
                success: true,
                data: {
                    token,
                    user: {
                        name: 'Guest User',
                        role: 'guest'
                    }
                }
            };
        });
