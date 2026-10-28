import { Router } from "../router.ts";
import type { NDB, Nserver } from "../server.ts";

const RESPONSE_INIT_200: ResponseInit = {
    status: 200,
    statusText: "OK",
    headers: {"Content-Type": "application/json; charset=utf-8"}
};
const RESPONSE_INIT_400: ResponseInit = {
    status: 400,
    statusText: "Bad Request",
    headers: {"Content-Type": "application/json; charset=utf-8"}
};

const RESPONSE_400 = () => new Response(
    '{"message":"Invalid request format"}',
    RESPONSE_INIT_400
);
const RESPONSE_401 = () => new Response(
    '{"message":"Authentication failed"}',
    {
        status: 401,
        statusText: "Unauthorized",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
const RESPONSE_403 = () => new Response(
    '{"message":"Got forbidden access to spesified url"}',
    {
        status: 401,
        statusText: "Forbidden",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
const RESPONSE_404 = () => new Response(
    '{"message":"Unknown url"}',
    {
        status: 404,
        statusText: "Not Found",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
const RESPONSE_405 = () => new Response(
    '{"message":"Method mismatch"}',
    {
        status: 405,
        statusText: "Method Not Allowed",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
const RESPONSE_429 = () => new Response(
    '{"message":"Too many requests from your device"}',
    {
        status: 405,
        statusText: "Too Many Requests",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
const RESPONSE_500 = () => new Response(
    '{"message":"Failed to process request due server error"}',
    {
        status: 500,
        statusText: "Internal Server Error",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
const RESPONSE_503 = () => new Response(
    '{"message":"Server busy and unavailable right now"}',
    {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    }
);
async function validateAndGetFormData(req: Request): Promise<FormData | null> {
    const contentType = req.headers.get("Content-Type");
    if (contentType == null || !contentType.includes("application/x-www-form-urlencoded")) {
        return null;
    }
    return await req.formData();
}
function validateAndGetToken(req: Request) {
    const authorization = req.headers.get("Authorization");
    if (authorization == null || authorization.length != (7 + 36) || !authorization.startsWith("Bearer ")) {
        return null;
    }
    return authorization.substring(7);
}

let server: Nserver;
let ndb: NDB;
const router = new Router();

export {
    RESPONSE_INIT_200,
    RESPONSE_INIT_400,
    RESPONSE_400,
    RESPONSE_401,
    RESPONSE_403,
    RESPONSE_404,
    RESPONSE_405,
    RESPONSE_429,
    RESPONSE_500,
    RESPONSE_503,
    validateAndGetFormData,
    validateAndGetToken,
    server,
    ndb,
    router
};