import { Elysia, t } from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { Database } from 'bun:sqlite';

export const authRoutes = (db: Database) =>
    new Elysia({ prefix: '/auth' })
        .use(
            jwt({
                name: 'jwt',
                secret: process.env.JWT_SECRET || 'baitybites-secret-key-2026'
            })
        )
        .post('/login', async ({ body, jwt, set }) => {
            const { username, password } = body;

            // Cari user di database
            const user: any = db.query('SELECT * FROM users WHERE username = ?').get(username);

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
        .get('/me', async ({ jwt, headers, set }) => {
            const authHeader = headers['authorization'];
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                set.status = 401;
                return { success: false, message: 'Unauthorized' };
            }

            const token = authHeader.split(' ')[1];
            const payload = await jwt.verify(token);

            if (!payload) {
                set.status = 401;
                return { success: false, message: 'Invalid token' };
            }

            return { success: true, data: payload };
        });
