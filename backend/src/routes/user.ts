import { UserRepo } from "../models/user.ts";
import { ndb, RESPONSE_400, RESPONSE_401, RESPONSE_500, RESPONSE_INIT_200, RESPONSE_INIT_400, router, validateAndGetFormData, validateAndGetToken } from "./holder.ts";

router.post("/user/register", async (req: Request): Promise<Response> => {
    const formData = await validateAndGetFormData(req);
    if (formData == null) {
        return RESPONSE_400();
    }

    const rawName = formData.get("name");
    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");

    if (rawEmail == null || typeof rawEmail != "string" || rawPassword == null || typeof rawPassword != "string") {
        return RESPONSE_400();
    }

    let name: string | null = null;
    const email = rawEmail.trim();
    const password = rawPassword.trim();

    if (email.length == 0 || email.match(/^[a-zA-Z0-9\-\._]+@[a-zA-Z0-9\-]+\.[a-zA-Z\.]+$/) == null || email.length > 100 || password.length < 8 || password.length > 100) {
        return RESPONSE_400();
    }

    if (rawName != null) {
        if (typeof rawName != "string") {
            return RESPONSE_400();
        }
        name = rawName.trim();
        if (name.length == 0) {
            name = null;
        } else if (name.length > 100) {
            return RESPONSE_400();
        }
    }

    let db;

    try {
        db = await ndb.clientPool.acquire();
        const success = await UserRepo.insert(db, name, email, password);
        if (!success) {
            return new Response(
                "Email has been used",
                RESPONSE_INIT_400
            );
        }
    } catch (e) {
        if (e instanceof Error) {
            console.error(`Error: ${e.message}`);
        }
        return RESPONSE_500();
    } finally {
        if (db) {
            await db.release();
        }
    }

    return new Response(
        JSON.stringify({ message: "Success" }),
        RESPONSE_INIT_200
    );
});

router.post("/user/login", async (req: Request): Promise<Response> => {
    const formData = await validateAndGetFormData(req);
    if (formData == null) {
        return RESPONSE_400();
    }

    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");

    if (rawEmail == null || typeof rawEmail != "string" || rawPassword == null || typeof rawPassword != "string") {
        return RESPONSE_400();
    }

    const email = rawEmail.trim();
    const password = rawPassword.trim();

    if (email.length == 0 || email.match(/^[a-zA-Z0-9\-\._]+@[a-zA-Z0-9\-]+\.[a-zA-Z\.]+$/) == null || email.length > 100 || password.length < 8 || password.length > 100) {
        return RESPONSE_400();
    }

    let db;
    let res;

    try {
        db = await ndb.clientPool.acquire();
        res = await UserRepo.authNew(db, email, password);
        if (!res) {
            return new Response(
                "Credential doesn't match",
                RESPONSE_INIT_400
            );
        }
    } catch (_e) {
        return RESPONSE_500();
    } finally {
        if (db) {
            await db.release();
        }
    }

    return new Response(JSON.stringify(res), RESPONSE_INIT_200);
});

router.post("/user/get", async (req: Request): Promise<Response> => {
    const formData = await validateAndGetFormData(req);
    if (formData == null) {
        return RESPONSE_400();
    }

    const rawId = formData.get("id");
    if (rawId == null || typeof rawId != "string") {
        return RESPONSE_400();
    }

    const id = parseInt(rawId);
    if (Number.isNaN(id) || id < 0) {
        return RESPONSE_400();
    }

    const token = validateAndGetToken(req);
    if (!token) {
        return RESPONSE_401();
    }

    let db;
    let res;

    try {
        db = await ndb.clientPool.acquire();
        res = await UserRepo.authAndGet(db, token, id);
        if (!res) {
            return RESPONSE_401();
        }
    } catch (_e) {
        return RESPONSE_500();
    } finally {
        if (db) {
            await db.release();
        }
    }

    return new Response(JSON.stringify({
        id: id,
        name: res.name,
        email: res.email
    }), RESPONSE_INIT_200);
});

router.post("/user/logout", async (req: Request): Promise<Response> => {
    const formData = await validateAndGetFormData(req);
    if (formData == null) {
        return RESPONSE_400();
    }

    const rawId = formData.get("id");
    if (rawId == null || typeof rawId != "string") {
        return RESPONSE_400();
    }

    const id = parseInt(rawId);
    if (Number.isNaN(id) || id < 0) {
        return RESPONSE_400();
    }

    const token = validateAndGetToken(req);
    if (!token) {
        return RESPONSE_401();
    }

    let db;
    let res;

    try {
        db = await ndb.clientPool.acquire();
        res = await UserRepo.authQuit(db, token, id);
    } catch (_e) {
        return RESPONSE_500();
    } finally {
        if (db) {
            await db.release();
        }
    }

    if (!res) {
        return RESPONSE_401();
    }
    return new Response(JSON.stringify({message: "Success"}), RESPONSE_INIT_200);
});

router.post("/user/delete", async (req: Request): Promise<Response> => {
    const formData = await validateAndGetFormData(req);
    if (formData == null) {
        return RESPONSE_400();
    }

    const rawId = formData.get("id");
    if (rawId == null || typeof rawId != "string") {
        return RESPONSE_400();
    }

    const id = parseInt(rawId);
    if (Number.isNaN(id) || id < 0) {
        return RESPONSE_400();
    }

    const token = validateAndGetToken(req);
    if (!token) {
        return RESPONSE_401();
    }

    let db;

    try {
        db = await ndb.clientPool.acquire();
        const success = await UserRepo.auth(db, token, id);
        if (!success) {
            return RESPONSE_401();
        }
        await UserRepo.delete(db, id);
    } catch (_e) {
        return RESPONSE_500();
    } finally {
        if (db) {
            await db.release();
        }
    }

    return new Response(JSON.stringify({message: "Success"}), RESPONSE_INIT_200);
});

router.post("/user/edit", async (req: Request): Promise<Response> => {
    const formData = await validateAndGetFormData(req);
    if (formData == null) {
        return RESPONSE_400();
    }

    const token = validateAndGetToken(req);
    if (!token) {
        return RESPONSE_401();
    }

    const rawId = formData.get("id");
    const rawName = formData.get("name");
    const rawEmail = formData.get("email");
    const rawPassword = formData.get("password");

    if (rawId == null || typeof rawId != "string" || rawEmail == null || typeof rawEmail != "string") {
        return RESPONSE_400();
    }

    let name: string | null = null;
    let password: string | null = null;
    const email = rawEmail.trim();
    const id = parseInt(rawId);
    
    if (Number.isNaN(id) || id < 0 || email.length == 0 || email.match(/^[a-zA-Z0-9\-\._]+@[a-zA-Z0-9\-]+\.[a-zA-Z\.]+$/) == null || email.length > 100) {
        return RESPONSE_400();
    }

    if (rawName != null) {
        if (typeof rawName != "string") {
            return RESPONSE_400();
        }
        name = rawName.trim();
        if (name.length == 0) {
            name = null;
        } else if (name.length > 100) {
            return RESPONSE_400();
        }
    }
    
    if (rawPassword != null) {
        if (typeof rawPassword != "string") {
            return RESPONSE_400();
        }
        password = rawPassword.trim();
        if (password.length == 0) {
            password = null;
        } else if (password.length < 8 || password.length > 100) {
            return RESPONSE_400();
        }
    }

    let db;

    try {
        db = await ndb.clientPool.acquire();
        if (!(await UserRepo.auth(db, token, id))) {
            return RESPONSE_401();
        }
        const success = await UserRepo.update(db, id, name, email, password);
        if (!success) {
            return new Response(
                "Email has been used",
                RESPONSE_INIT_400
            );
        }
    } catch (e) {
        if (e instanceof Error) {
            console.error(`Error: ${e.message}`);
        }
        return RESPONSE_500();
    } finally {
        if (db) {
            await db.release();
        }
    }

    return new Response(
        JSON.stringify({ message: "Success" }),
        RESPONSE_INIT_200
    );
});