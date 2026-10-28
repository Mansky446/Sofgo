import type { MysqlPoolClient, MysqlClient } from "@db/mysql";
import { encodeHex } from "@std/encoding";

type User = {
    id: number,
    name: string,
    email: string,
    createdAt: Date
};

class UserRepo {
    constructor() {}

    private static async createPasswordHash(salt: Uint8Array<ArrayBuffer>, password: string): Promise<string> {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits"]
        );
        const deriveBits = await crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 300000,
                hash: "SHA-256"
            },
            key,
            256
        );
        return encodeHex(deriveBits);
    }

    static async create(db: MysqlClient): Promise<void> {
        try {
            await db.execute(`CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) DEFAULT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                passwordSalt VARCHAR(32) NOT NULL,
                passwordHash VARCHAR(64) NOT NULL,
                sessionId VARCHAR(36) DEFAULT NULL,
                createdAt DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        } catch (e) {
            throw e;
        }
    }

    static async drop(db: MysqlClient): Promise<void> {
        try {
            await db.execute("DROP TABLE IF EXISTS users;");
        } catch (e) {
            throw e;
        }
    }

    static async get(db: MysqlPoolClient, id: number): Promise<User | null> {
        try {
            const result = await db.queryOne("SELECT id, name, email, createdAt FROM users WHERE id = ?;", [id]);
            if (!result) {
                return null;
            }
            return result as User;
        } catch (e) {
            throw e;
        }
    }

    static async gets(db: MysqlPoolClient): Promise<User[]> {
        try {
            const result = await db.query("SELECT id, name, email, createdAt FROM users;");
            return result as User[];
        } catch (e) {
            throw e;
        }
    }

    static async insert(db: MysqlPoolClient, name: string | null, email: string, password: string): Promise<boolean> {
        try {
            const saltBytes = crypto.getRandomValues(new Uint8Array(16));
            const passwordHash = await UserRepo.createPasswordHash(saltBytes, password);
            const curDate = new Date();
            const result = await db.execute(
                "INSERT INTO users (name, email, passwordSalt, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?);", 
                [name, email, saltBytes.toHex(), passwordHash, curDate]
            );

            if (!result) {
                throw new Error("Insert into users table failed");
            }
            return true;
        } catch (e) {
            if (e instanceof Error) {
                if ("code" in e && typeof e.code == "number" && e.code == 1062) {
                    return false;
                }
                if ("errno" in e && typeof e.errno == "number" && e.errno == 1062) {
                    return false;
                }
            }
            throw e;
        }
    }

    static async delete(db: MysqlPoolClient, id: number): Promise<void> {
        try {
            const result = await db.execute("DELETE FROM users WHERE id = ?;", [id]);
            if (!result || result < 1) {
                throw new Error("Delete from users table failed");
            }
        } catch (e) {
            throw e;
        }
    }

    static async update(db: MysqlPoolClient, id: number, name: string | null, email: string, password: string | null): Promise<boolean> {
        try {
            let result: number | undefined = undefined;
            if (password != null) {
                const saltBytes = crypto.getRandomValues(new Uint8Array(16));
                const passwordHash = await UserRepo.createPasswordHash(saltBytes, password);
                result = await db.execute(
                    "UPDATE users SET name = ?, email = ?, passwordSalt = ?, passwordHash = ?, sessionId = NULL WHERE id = ?;",
                    [name, email, saltBytes.toHex(), passwordHash, id]
                );
            } else {
                result = await db.execute("UPDATE users SET name = ?, email = ? WHERE id = ?;", [name, email, id]);
            }
            if (!result) {
                throw new Error("Update set users table failed");
            }
        } catch (e) {
            if (e instanceof Error) {
                if ("code" in e && typeof e.code == "number" && e.code == 1062) {
                    return false;
                }
                if ("errno" in e && typeof e.errno == "number" && e.errno == 1062) {
                    return false;
                }
            }
            throw e;
        }
        return true;
    }

    static async auth(db: MysqlPoolClient, token: string, id: number): Promise<boolean> {
        try {
            const result = await db.queryOne("SELECT id, sessionId FROM users WHERE id = ? AND sessionId = ?;", [id, token]);
            if (!result) {
                return false;
            }
        } catch (e) {
            throw e;
        }

        return true;
    }
    
    static async authAndGet(db: MysqlPoolClient, token: string, id: number): Promise<User | null> {
        try {
            const result = await db.queryOne("SELECT id, name, email, sessionId, createdAt FROM users WHERE id = ?", [id]);
            if (!result || result.sessionId == null || result.sessionId != token) {
                return null;
            }
            return result as User;
        } catch (e) {
            throw e;
        }
    }

    static async authNew(db: MysqlPoolClient, email: string, password: string): Promise<{ id: number, sessionId: string } | null> {
        try {
            const resultq = await db.queryOne("SELECT id, email, passwordSalt, passwordHash FROM users WHERE email = ?", [email]);
            if (!resultq) {
                return null;
            }
            
            const saltBytes = Uint8Array.fromHex(resultq.passwordSalt as string);
            const passwordHash = await UserRepo.createPasswordHash(saltBytes, password);
            if (passwordHash != resultq.passwordHash) {
                return null;
            }

            const sessionId = crypto.randomUUID();
            const resultu = await db.execute("UPDATE users SET sessionId = ? WHERE id = ?;", [sessionId, resultq.id as number]);
            if (!resultu || resultu < 1) {
                throw new Error("Update set users table failed");;
            }

            return { id: resultq.id as number, sessionId: sessionId };
        } catch (e) {
            throw e;
        }
    }

    static async authQuit(db: MysqlPoolClient, token: string, id: number): Promise<boolean> {
        try {
            const resultq = await db.queryOne("SELECT id, sessionId FROM users WHERE id = ? AND sessionId = ?;", [id, token]);
            if (!resultq) {
                return false;
            }
            await db.execute("UPDATE users SET sessionId = NULL WHERE id = ?", [id]);
        } catch (e) {
            throw e;
        }

        return true;
    }
}

export { type User, UserRepo };