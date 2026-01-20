
import { Elysia } from "elysia";
import { jwtConfig } from "../utils/jwt";

export const authPlugin = (app: Elysia) => app
    .use(jwtConfig)
    .derive(async ({ jwt, headers }) => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { user: null };
        }
        const token = authHeader.split(' ')[1];
        const payload = await jwt.verify(token);
        return { user: payload };
    });
