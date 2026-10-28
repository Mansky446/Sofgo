enum Method {
    GET = 0,
    POST = 1
};

type RequestData = {
    path: string,
    method: Method,
    search: { [key: string]: string },
    body: string | null
};

const METHOD_STRINGS = ["GET", "POST"];

type PostHandler = (req: Request, ...params: string[]) => Response | Promise<Response>;
type GetHandler = ((search: URLSearchParams, ...params: string[]) => Response | Promise<Response>) | ((...params: string[]) => Response | Promise<Response>);
type Handler = PostHandler | GetHandler;
type DRouteDetail = { method: Method, handler: string, params: { at: number, name: string }[] };
type DRouteAny = { static: DRouteDetail | null, dynamic: DRouteDetail | null, staticNext: { [key: string]: DRouteAny }, dynamicNext: DRouteAny | null };

function pathStripper(path: string): string {
    path = path.trim();
    if (path[0] != '/') {
        path = '/' + path;
    }
    if (path.length > 1 && path[path.length - 1] == '/') {
        path = path.substring(0, path.length - 1);
    }
    return path;
}

function createPathSchemas(path: string): { isStatic: boolean, path: string }[] {
    const regex: RegExp = /(?=\/:([^\/]+))+/g;
    const pathSeqs: RegExpExecArray[] = [...path.matchAll(regex)];

    if (pathSeqs.length == 0) {
        return [{ isStatic: true, path: path }];
    }

    let i: number = 0;
    const schemas: { isStatic: boolean, path: string }[] = [];
    
    for (const pathSeq of pathSeqs) {
        if (i < pathSeq.index) {
            schemas.push({ isStatic: true, path: path.substring(i, pathSeq.index + 1) });
            i = pathSeq.index;
        }
        schemas.push({ isStatic: false, path: pathSeq[1] });
        i += pathSeq[1].length + 2;
    }

    if (i < path.length) {
        schemas.push({ isStatic: true, path: path.substring(i, path.length) });
    }
    
    return schemas;
}

function handlerToString(handler: Handler): string | null {
    const string = handler.toString();
    const lBrace = string.indexOf('{');
    const rBrace = string.lastIndexOf('}');
    if (lBrace != -1 && rBrace != -1) {
        return string.substring(lBrace + 1, rBrace).trim();
    }
    if (string.match(/=>/) != null) {
        return "return " + string.split(/=>/)[1].trim();
    }
    return null;
}

function generateDRouteDetailBlock(dRouteDetail: DRouteDetail): string {
    let code = `{ if (__m != "${METHOD_STRINGS[dRouteDetail.method]}") {return RESPONSE_405();} {`;
    for (let i = 0; i < dRouteDetail.params.length; i++) {
        const {at, name} = dRouteDetail.params[i];
        code += `let ${name} = __p${at};`;
    }
    if (dRouteDetail.method == Method.GET) {
        code += "let search = __ou.searchParams;";
    } else {
        code += "let req = __r;";
    }
    code += `${dRouteDetail.handler} }}`;
    return code;
}

function generateDRouteAnyCode(index: number, dRouteAny: DRouteAny, fromStatic: boolean): string {
    let code = "";
    if (dRouteAny.static != null) {
        code += `if (__u.length == __i) ${generateDRouteDetailBlock(dRouteAny.static)}`;
    }

    for (const key in dRouteAny.staticNext) {
        if (!Object.hasOwn(dRouteAny.staticNext, key)) continue;
        const nextDRouteAny = dRouteAny.staticNext[key];
        code += index == 0 ? `if (__u.startsWith("${key}")) { __i = ${key.length};` : `if (__u.startsWith("${key}", __i)) { __i += ${key.length};`;
        code += generateDRouteAnyCode(index + 1, nextDRouteAny, true);
        code += "} else "
    }

    if (dRouteAny.dynamicNext != null) {
        code += `{let __lsi = __u.indexOf('/', __i${fromStatic ? "" : " + 1"});__lsi = __lsi == -1 ? __u.length : __lsi;`;
        code += `const __p${index} = __u.substring(__i${fromStatic ? "" : " + 1"}, __lsi);__i = __lsi;`;
        const nextDRouteAny = dRouteAny.dynamicNext;
        if (nextDRouteAny.dynamic == null) {
            code += "if (__lsi == __u.length) {return RESPONSE_404();} else ";
        } else {
            code += `if (__lsi == __u.length) ${generateDRouteDetailBlock(nextDRouteAny.dynamic)} else `;
        }
        code += `${generateDRouteAnyCode(index + 1, nextDRouteAny, false)}}`;
    }

    if (index > 0) {
        code += "return RESPONSE_404();";
    }
    return code;
}

class Router {
    private staticRoute: { [key: string]: { method: Method, handler: string } };
    private dynamicRoute: DRouteAny;

    constructor() {
        this.staticRoute = {};
        this.dynamicRoute = { static: null, dynamic: null, staticNext: {}, dynamicNext: null };
    }

    private registry(method: Method, path: string, handler: Handler) {
        const schemas: { isStatic: boolean, path: string }[] = createPathSchemas(pathStripper(path));
        const lastSchema: { isStatic: boolean, path: string } = schemas.pop() ?? { isStatic: true, path: path };
        const handlerString = handlerToString(handler);

        if (handlerString == null) {
            console.log(`Route ${path} handler is invalid`);
            return;
        }
    
        if (schemas.length == 0) {
            if (lastSchema.path in this.staticRoute) {
                console.log(`Duplicate route ${path}`);
            } else {
                this.staticRoute[lastSchema.path] = { method: method, handler: handlerString };
            }
            return;
        }
    
        let dRouteAny: DRouteAny = this.dynamicRoute;
        let i = 0;
        const params: { at: number, name: string }[] = [];
    
        for (const schema of schemas) {
            if (schema.isStatic) {
                if (!(schema.path in dRouteAny.staticNext)) {
                    dRouteAny.staticNext[schema.path] = { static: null, dynamic: null, staticNext: {}, dynamicNext: null };
                }
                dRouteAny = dRouteAny.staticNext[schema.path];
            } else {
                if (dRouteAny.dynamicNext == null) {
                    dRouteAny.dynamicNext = { static: null, dynamic: null, staticNext: {}, dynamicNext: null };
                }
                if (schema.path.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) == null) {
                    console.log(`Invalid param name ${schema.path}`);
                    return;
                }
                dRouteAny = dRouteAny.dynamicNext;
                params.push({ at: i, name: schema.path });
            }
            i++;
        }
    
        if (lastSchema.isStatic) {
            if (!(lastSchema.path in dRouteAny.staticNext)) {
                dRouteAny.staticNext[lastSchema.path] = { static: null, dynamic: null, staticNext: {}, dynamicNext: null };
            }
            dRouteAny = dRouteAny.staticNext[lastSchema.path];
            if (dRouteAny.static != null) {
                console.log(`Duplicate route ${path}`);
            } else {
                dRouteAny.static = { method: method, handler: handlerString, params: params };
            }
            return;
        }
    
        if (dRouteAny.dynamicNext == null) {
            dRouteAny.dynamicNext = { static: null, dynamic: null, staticNext: {}, dynamicNext: null };
        }
    
        dRouteAny = dRouteAny.dynamicNext;
    
        if (dRouteAny.dynamic != null) {
            console.log(`Duplicate route ${path}`);
        } else {
            params.push({ at: schemas.length, name: lastSchema.path });
            dRouteAny.dynamic = { method: method, handler: handlerString, params: params };
        }
    }
    
    post(path: string, handler: PostHandler) {
        this.registry(Method.POST, path, handler);
    }
    
    get(path: string, handler: GetHandler) {
        this.registry(Method.GET, path, handler);
    }
    
    private compile(header: string): string {
        let code = `
            import { createServer, type Nserver, type NDB, openDB, openHTTP, shutdown } from "../server.ts";

            function compileRoute(server: Nserver, ndb: NDB): (req: Request) => Promise<Response> {
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
                    try {
                        const formData = await req.formData();
                        return formData;
                    } catch (_e) {
                        return null;
                    }
                }
                function validateAndGetToken(req: Request) {
                    const authorization = req.headers.get("Authorization");
                    if (authorization == null || authorization.length != (7 + 36) || !authorization.startsWith("Bearer ")) {
                        return null;
                    }
                    return authorization.substring(7);
                }

                return async (__r: Request): Promise<Response> => {
                    const __m = __r.method;
                    const __ou = new URL(__r.url);
                    const __u = __ou.pathname.length > 1 && __ou.pathname[__ou.pathname.length - 1] == '/' ? __ou.pathname.substring(0, __ou.pathname.length - 1) : __ou.pathname;
        `;
    
        if (Object.keys(this.staticRoute).length > 0) {
            code += "switch (__u) {";
            for (const key in this.staticRoute) {
                if (!Object.hasOwn(this.staticRoute, key)) continue;
                const {method, handler} = this.staticRoute[key];
                code += `case "${key}":
                    if (__m != "${METHOD_STRINGS[method]}") {return RESPONSE_405();}
                    {${method == Method.GET ? "let search = __ou.searchParams;" : "let req = __r;"}${handler}}`;
            }
            code += "default: break;}";
        }

        if (this.dynamicRoute.dynamic != null || this.dynamicRoute.dynamicNext != null || this.dynamicRoute.staticNext != null) {
            code += "let __i = 0;"
            code += generateDRouteAnyCode(0, this.dynamicRoute, false);
        }

        code += "return RESPONSE_404();};}export {compileRoute};";
        return header + code;
    }
    
    async writeInto(path: string, header: string): Promise<void> {
        try {
            const code = this.compile(header);
            await Deno.writeTextFile(path, code, { create: true, append: false });
            const command = new Deno.Command("deno", {
                args: ["fmt", path]
            });
            const {success} = await command.output();
            if (!success) {
                throw new Error("Failed to reformat");
            }
        } catch (e) {
            throw e;
        }
    }
}

export type { RequestData, PostHandler, GetHandler };
export { Method, Router };