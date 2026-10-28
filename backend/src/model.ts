import { type MysqlClient, MysqlError, type MysqlPoolClient } from "@db/mysql";
import { decodeHex, encodeHex } from "@std/encoding";

type Playlist = {
    id: number,
    userId: number,
    name: string
};

async function createPlaylistTable() {
    try {
        const result = await dbclient.execute(`CREATE TABLE IF NOT EXISTS playlists (
            id INT PRIMARY KEY AUTO_INCREMENT,
            userId INT NOT NULL,
            name VARCHAR(100) NOT NULL,

            CONSTRAINT fk_playlists_users
            FOREIGN KEY (userId) REFERENCES users(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        if (result == undefined) {
            return false;
        }
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when creating table playlists: ${e.message}`);
        } else {
            console.error(`Error when creating table playlists ${e}`);
        }
        return false;
    }
    return true;
}

async function dropPlaylistTable(): Promise<boolean> {
    try {
        await dbclient.execute("DROP TABLE IF EXISTS playlists;");
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when drop table playlists: ${e.message}`);
        } else {
            console.error(`Error when drop table playlists ${e}`);
        }
        return false;
    }
    return true;
}

type PlaylistItem = {
    id: number,
    playlistId: number,
    surahId: number
};

async function createPlaylistItemTable() {
    try {
        const result = await dbclient.execute(`CREATE TABLE IF NOT EXISTS playlistItems (
            id INT PRIMARY KEY AUTO_INCREMENT,
            playlistId INT NOT NULL,
            surahId INT NOT NULL,

            CONSTRAINT fk_playlistItems_playlists
            FOREIGN KEY (playlistId) REFERENCES playlists(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        if (result == undefined) {
            return false;
        }
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when creating table playlistItems: ${e.message}`);
        } else {
            console.error(`Error when creating table playlistItems ${e}`);
        }
        return false;
    }
    return true;
}

async function dropPlaylistItemTable(): Promise<boolean> {
    try {
        await dbclient.execute("DROP TABLE IF EXISTS playlistItems;");
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when drop table playlistItems: ${e.message}`);
        } else {
            console.error(`Error when drop table playlistItems ${e}`);
        }
        return false;
    }
    return true;
}

type Bookmark = {
    id: number,
    userId: number,
    name: string
};

async function createBookmarkTable() {
    try {
        const result = await dbclient.execute(`CREATE TABLE IF NOT EXISTS bookmarks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            userId INT NOT NULL,
            name VARCHAR(100) NOT NULL,

            CONSTRAINT fk_bookmarks_users
            FOREIGN KEY (userId) REFERENCES users(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        if (result == undefined) {
            return false;
        }
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when creating table bookmarks: ${e.message}`);
        } else {
            console.error(`Error when creating table bookmarks ${e}`);
        }
        return false;
    }
    return true;
}

async function dropBookmarkTable(): Promise<boolean> {
    try {
        await dbclient.execute("DROP TABLE IF EXISTS bookmarks;");
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when drop table bookmarks: ${e.message}`);
        } else {
            console.error(`Error when drop table bookmarks ${e}`);
        }
        return false;
    }
    return true;
}

type BookmarkItem = {
    id: number,
    bookmarkId: number,
    ayatId: number
};

async function createBookmarkItemTable() {
    try {
        const result = await dbclient.execute(`CREATE TABLE IF NOT EXISTS bookmarkItems (
            id INT PRIMARY KEY AUTO_INCREMENT,
            bookmarkId INT NOT NULL,
            ayatId INT NOT NULL,

            CONSTRAINT fk_bookmarkItems_bookmarks
            FOREIGN KEY (bookmarkId) REFERENCES bookmarks(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`);
        if (result == undefined) {
            return false;
        }
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when creating table bookmarks: ${e.message}`);
        } else {
            console.error(`Error when creating table bookmarks ${e}`);
        }
        return false;
    }
    return true;
}

async function dropBookmarkItemTable(): Promise<boolean> {
    try {
        await dbclient.execute("DROP TABLE IF EXISTS bookmarkItems;");
    } catch (e) {
        if (e instanceof MysqlError) {
            console.error(`Error when drop table bookmarkItems: ${e.message}`);
        } else {
            console.error(`Error when drop table bookmarkItems ${e}`);
        }
        return false;
    }
    return true;
}

function setDBClient(c: MysqlClient) {
    dbclient = c;
}

async function migrate(): Promise<boolean> {
    if (!(await dropUserTable())) { return false; }
    if (!(await dropFavoriteTable())) { return false; }
    if (!(await dropPlaylistTable())) { return false; }
    if (!(await dropPlaylistItemTable())) { return false; }
    if (!(await dropBookmarkTable())) { return false; }
    if (!(await dropBookmarkItemTable())) { return false; }
    
    if (!(await createUserTable())) { return false; }
    if (!(await createFavoriteTable())) { return false; }
    if (!(await createPlaylistTable())) { return false; }
    if (!(await createPlaylistItemTable())) { return false; }
    if (!(await createBookmarkTable())) { return false; }
    if (!(await createBookmarkItemTable())) { return false; }

    return true;
}

export {
    type User,
    type Playlist,
    type PlaylistItem,
    type Favorite,
    type Bookmark,
    type BookmarkItem,
    
    userGet,
    userGets,
    userCreate,
    userDelete,
    userSave,
    
    setDBClient,
    migrate
};