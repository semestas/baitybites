
import { jwt } from '@elysiajs/jwt';

const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
}

export const jwtConfig = jwt({
    name: 'jwt',
    secret
});
