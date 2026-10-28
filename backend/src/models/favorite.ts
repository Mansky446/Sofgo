import type { MysqlPoolClient, MysqlClient } from "@db/mysql";
import type { Surah } from "./cache.ts";

type Favorite = {
    id: number,
    userId: number,
    ayatId: number
};

class FavoriteRepo {
    constructor() {}

    static async create(db: MysqlClient): Promise<void> {
        try {
            await db.execute(`CREATE TABLE IF NOT EXISTS favorites (
                id INT PRIMARY KEY AUTO_INCREMENT,
                userId INT NOT NULL,
                ayatId INT NOT NULL,

                UNIQUE KEY uk_users_ayats (userId, ayatId),
                INDEX ix_i_users (id, userId),

                CONSTRAINT fk_favorites_users
                FOREIGN KEY (userId) REFERENCES users(id)
                ON DELETE CASCADE
                ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        } catch (e) {
            throw e;
        }
    }

    static async drop(db: MysqlClient): Promise<void> {
        try {
            await db.execute("DROP TABLE IF EXISTS favorites;");
        } catch (e) {
            throw e;
        }
    }

    static async getsUser(db: MysqlPoolClient, userId: number, surah: Surah): Promise<Favorite[]> {
        try {
            const result = await db.query("SELECT id, ayatId FROM favorites WHERE userId = ? AND ayatId >= ? AMD ayatId < ?;", [userId, surah.ayatStart, surah.ayatStart + surah.ayatCount]);
            return result as Favorite[];
        } catch (e) {
            throw e;
        }
    }

    static async insert(db: MysqlPoolClient, userId: number, ayatId: number): Promise<boolean> {
        try {
            const result = await db.execute("INSERT INTO favorites (userId, ayatId) VALUES (?, ?);", [userId, ayatId]);

            if (!result) {
                return false;
            }
            return true;
        } catch (e) {
            throw e;
        }
    }

    static async delete(db: MysqlPoolClient, id: number, userId: number): Promise<boolean> {
        try {
            const result = await db.execute("DELETE FROM favorites WHERE id = ? AND userId = ?;", [id, userId]);
            if (!result || result < 1) {
                return false;
            }
        } catch (e) {
            throw e;
        }
        return true;
    }
}

export { type Favorite, FavoriteRepo };