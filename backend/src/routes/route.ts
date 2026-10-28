import { MAX_SURAH, SurahRepo } from "../models/surah.ts";
import { AyatRepo, MAX_AYAT } from "../models/ayat.ts";
import { getCachePath } from "../models/cache.ts";
import { UserRepo } from "../models/user.ts";

import {
  createServer,
  type NDB,
  type Nserver,
  openDB,
  openHTTP,
  shutdown,
} from "../server.ts";

function compileRoute(
  server: Nserver,
  ndb: NDB,
): (req: Request) => Promise<Response> {
  const RESPONSE_INIT_200: ResponseInit = {
    status: 200,
    statusText: "OK",
    headers: { "Content-Type": "application/json; charset=utf-8" },
  };
  const RESPONSE_INIT_400: ResponseInit = {
    status: 400,
    statusText: "Bad Request",
    headers: { "Content-Type": "application/json; charset=utf-8" },
  };

  const RESPONSE_400 = () =>
    new Response(
      '{"message":"Invalid request format"}',
      RESPONSE_INIT_400,
    );
  const RESPONSE_401 = () =>
    new Response(
      '{"message":"Authentication failed"}',
      {
        status: 401,
        statusText: "Unauthorized",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  const RESPONSE_403 = () =>
    new Response(
      '{"message":"Got forbidden access to spesified url"}',
      {
        status: 401,
        statusText: "Forbidden",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  const RESPONSE_404 = () =>
    new Response(
      '{"message":"Unknown url"}',
      {
        status: 404,
        statusText: "Not Found",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  const RESPONSE_405 = () =>
    new Response(
      '{"message":"Method mismatch"}',
      {
        status: 405,
        statusText: "Method Not Allowed",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  const RESPONSE_429 = () =>
    new Response(
      '{"message":"Too many requests from your device"}',
      {
        status: 405,
        statusText: "Too Many Requests",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  const RESPONSE_500 = () =>
    new Response(
      '{"message":"Failed to process request due server error"}',
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  const RESPONSE_503 = () =>
    new Response(
      '{"message":"Server busy and unavailable right now"}',
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  async function validateAndGetFormData(
    req: Request,
  ): Promise<FormData | null> {
    const contentType = req.headers.get("Content-Type");
    if (
      contentType == null ||
      !contentType.includes("application/x-www-form-urlencoded;")
    ) {
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
    if (
      authorization == null || authorization.length != (7 + 36) ||
      !authorization.startsWith("Bearer ")
    ) {
      return null;
    }
    return authorization.substring(7);
  }

  return async (__r: Request): Promise<Response> => {
    const __m = __r.method;
    const __ou = new URL(__r.url);
    const __u =
      __ou.pathname.length > 1 && __ou.pathname[__ou.pathname.length - 1] == "/"
        ? __ou.pathname.substring(0, __ou.pathname.length - 1)
        : __ou.pathname;
    switch (__u) {
      case "/init-surah":
        if (__m != "GET") return RESPONSE_405();
        {
          let search = __ou.searchParams;
          const surahs = SurahRepo.gets();
          const data = new Array(20);
          for (let i = 0; i < 20; i++) {
            const surah = surahs[i];
            data[i] = {
              id: i,
              no: i + 1,
              name: surah.name,
              arabName: surah.arabName,
              ayatCount: surah.ayatCount,
            };
          }
          return new Response(
            JSON.stringify({
              surahCount: MAX_SURAH,
              fetchedCount: 20,
              data,
            }),
            RESPONSE_INIT_200,
          );
        }
      case "/surah":
        if (__m != "GET") return RESPONSE_405();
        {
          let search = __ou.searchParams;
          const rawFrom = search.get("from");
          const rawLimit = search.get("limit");
          let from = 0;
          if (rawFrom != null) {
            const cfrom = parseInt(rawFrom);
            from = Number.isNaN(cfrom) ? from : cfrom;
            if (from >= MAX_SURAH) {
              new Response(
                JSON.stringify({
                  fetchedCount: 0,
                  data: [],
                }),
                RESPONSE_INIT_200,
              );
            }
          }
          let limit = 30;
          if (rawLimit != null) {
            const climit = parseInt(rawLimit);
            limit = Number.isNaN(climit) || limit < climit ? limit : climit;
            if (limit <= 0) {
              new Response(
                JSON.stringify({
                  fetchedCount: 0,
                  data: [],
                }),
                RESPONSE_INIT_200,
              );
            }
          }
          const fetchedCount = Math.min(MAX_SURAH - from, limit);
          const surahs = SurahRepo.gets();
          const data = new Array(fetchedCount);
          for (let i = 0, j = from; i < fetchedCount; i++, j++) {
            const surah = surahs[j];
            data[i] = {
              id: j,
              no: j + 1,
              name: surah.name,
              arabName: surah.arabName,
              ayatCount: surah.ayatCount,
            };
          }
          return new Response(
            JSON.stringify({
              fetchedCount,
              data,
            }),
            RESPONSE_INIT_200,
          );
        }
      case "/user/register":
        if (__m != "POST") return RESPONSE_405();
        {
          let req = __r;
          const formData = await validateAndGetFormData(req);
          if (formData == null) {
            return RESPONSE_400();
          }
          const rawName = formData.get("name");
          const rawEmail = formData.get("email");
          const rawPassword = formData.get("password");
          if (
            rawEmail == null || typeof rawEmail != "string" ||
            rawPassword == null || typeof rawPassword != "string"
          ) {
            return RESPONSE_400();
          }
          let name = null;
          const email = rawEmail.trim();
          const password = rawPassword.trim();
          if (
            email.length == 0 ||
            email.match(/^[a-zA-Z0-9\-\._]+@[a-zA-Z0-9\-]+\.[a-zA-Z\.]+$/) ==
              null ||
            email.length > 100 || password.length < 8 || password.length > 100
          ) {
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
              return new Response("Email has been used", RESPONSE_INIT_400);
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
            JSON.stringify({
              message: "Success",
            }),
            RESPONSE_INIT_200,
          );
        }
      case "/user/login":
        if (__m != "POST") return RESPONSE_405();
        {
          let req = __r;
          const formData = await validateAndGetFormData(req);
          if (formData == null) {
            return RESPONSE_400();
          }
          const rawEmail = formData.get("email");
          const rawPassword = formData.get("password");
          if (
            rawEmail == null || typeof rawEmail != "string" ||
            rawPassword == null || typeof rawPassword != "string"
          ) {
            return RESPONSE_400();
          }
          const email = rawEmail.trim();
          const password = rawPassword.trim();
          if (
            email.length == 0 ||
            email.match(/^[a-zA-Z0-9\-\._]+@[a-zA-Z0-9\-]+\.[a-zA-Z\.]+$/) ==
              null ||
            email.length > 100 || password.length < 8 || password.length > 100
          ) {
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
                RESPONSE_INIT_400,
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
        }
      case "/user/get":
        if (__m != "POST") return RESPONSE_405();
        {
          let req = __r;
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
          return new Response(
            JSON.stringify({
              id: id,
              name: res.name,
              email: res.email,
            }),
            RESPONSE_INIT_200,
          );
        }
      case "/user/logout":
        if (__m != "POST") return RESPONSE_405();
        {
          let req = __r;
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
          return new Response(
            JSON.stringify({
              message: "Success",
            }),
            RESPONSE_INIT_200,
          );
        }
      case "/user/delete":
        if (__m != "POST") return RESPONSE_405();
        {
          let req = __r;
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
          return new Response(
            JSON.stringify({
              message: "Success",
            }),
            RESPONSE_INIT_200,
          );
        }
      case "/user/edit":
        if (__m != "POST") return RESPONSE_405();
        {
          let req = __r;
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
          if (
            rawId == null || typeof rawId != "string" || rawEmail == null ||
            typeof rawEmail != "string"
          ) {
            return RESPONSE_400();
          }
          let name = null;
          let password = null;
          const email = rawEmail.trim();
          const id = parseInt(rawId);
          if (
            Number.isNaN(id) || id < 0 || email.length == 0 ||
            email.match(/^[a-zA-Z0-9\-\._]+@[a-zA-Z0-9\-]+\.[a-zA-Z\.]+$/) ==
              null ||
            email.length > 100
          ) {
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
            if (!await UserRepo.auth(db, token, id)) {
              return RESPONSE_401();
            }
            const success = await UserRepo.update(
              db,
              id,
              name,
              email,
              password,
            );
            if (!success) {
              return new Response("Email has been used", RESPONSE_INIT_400);
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
            JSON.stringify({
              message: "Success",
            }),
            RESPONSE_INIT_200,
          );
        }
      default:
        break;
    }
    let __i = 0;
    if (__u.startsWith("/surah/")) {
      __i = 7;
      {
        let __lsi = __u.indexOf("/", __i);
        __lsi = __lsi == -1 ? __u.length : __lsi;
        const __p1 = __u.substring(__i, __lsi);
        __i = __lsi;
        if (__lsi == __u.length) {
          if (__m != "GET") return RESPONSE_405();
          {
            let id = __p1;
            let search = __ou.searchParams;
            const cid = parseInt(id);
            if (Number.isNaN(cid) || cid < 0 || cid >= MAX_SURAH) {
              return RESPONSE_404();
            }
            const surah = SurahRepo.get(cid);
            return new Response(
              JSON.stringify({
                no: cid + 1,
                name: surah.name,
                arabName: surah.arabName,
                ayatCount: surah.ayatCount,
                from: surah.from,
                meaning: surah.meaning,
              }),
              RESPONSE_INIT_200,
            );
          }
        } else if (__u.startsWith("/init-ayat", __i)) {
          __i += 10;
          if (__u.length == __i) {
            if (__m != "GET") return RESPONSE_405();
            {
              let surahId = __p1;
              let search = __ou.searchParams;
              const csurahId = parseInt(surahId);
              if (
                Number.isNaN(csurahId) || csurahId < 0 || csurahId >= MAX_SURAH
              ) {
                return RESPONSE_404();
              }
              const surah = SurahRepo.get(csurahId);
              const ayats = AyatRepo.gets();
              const fetchedCount = Math.min(10, surah.ayatCount);
              const data = new Array(fetchedCount);
              for (let i = 0, j = surah.ayatStart; i < fetchedCount; i++, j++) {
                const ayat = ayats[j];
                data[i] = {
                  id: j,
                  no: i + 1,
                  text: ayat.text,
                  arabText: ayat.arabText,
                  indoText: ayat.indoText,
                  isFavorite: false,
                  bookmarks: [],
                };
              }
              return new Response(
                JSON.stringify({
                  ayatCount: surah.ayatCount,
                  fetchedCount,
                  data,
                }),
                RESPONSE_INIT_200,
              );
            }
          }
          return RESPONSE_404();
        } else if (__u.startsWith("/ayat", __i)) {
          __i += 5;
          if (__u.length == __i) {
            if (__m != "GET") return RESPONSE_405();
            {
              let surahId = __p1;
              let search = __ou.searchParams;
              const csurahId = parseInt(surahId);
              if (
                Number.isNaN(csurahId) || csurahId < 0 || csurahId >= MAX_SURAH
              ) {
                return RESPONSE_404();
              }
              const rawFrom = search.get("from");
              const rawLimit = search.get("limit");
              const surah = SurahRepo.get(csurahId);
              let from = 0;
              if (rawFrom != null) {
                const cfrom = parseInt(rawFrom);
                from = Number.isNaN(cfrom) ? from : cfrom;
                if (from >= surah.ayatCount) {
                  new Response(
                    JSON.stringify({
                      fetchedCount: 0,
                      data: [],
                    }),
                    RESPONSE_INIT_200,
                  );
                }
              }
              let limit = 15;
              if (rawLimit != null) {
                const climit = parseInt(rawLimit);
                limit = Number.isNaN(climit) || limit < climit ? limit : climit;
                if (limit <= 0) {
                  new Response(
                    JSON.stringify({
                      fetchedCount: 0,
                      data: [],
                    }),
                    RESPONSE_INIT_200,
                  );
                }
              }
              const ayats = AyatRepo.gets();
              const fetchedCount = Math.min(limit, surah.ayatCount - from);
              const data = new Array(fetchedCount);
              for (
                let i = 0, j = surah.ayatStart + from;
                i < fetchedCount;
                i++, j++
              ) {
                const ayat = ayats[j];
                data[i] = {
                  id: j,
                  no: i + from + 1,
                  text: ayat.text,
                  arabText: ayat.arabText,
                  indoText: ayat.indoText,
                  isFavorite: false,
                  bookmarks: [],
                };
              }
              return new Response(
                JSON.stringify({
                  fetchedCount,
                  data,
                }),
                RESPONSE_INIT_200,
              );
            }
          }
          return RESPONSE_404();
        } else return RESPONSE_404();
      }
      return RESPONSE_404();
    } else if (__u.startsWith("/stream-ayat/")) {
      __i = 13;
      {
        let __lsi = __u.indexOf("/", __i);
        __lsi = __lsi == -1 ? __u.length : __lsi;
        const __p1 = __u.substring(__i, __lsi);
        __i = __lsi;
        if (__lsi == __u.length) {
          if (__m != "GET") return RESPONSE_405();
          {
            let id = __p1;
            let search = __ou.searchParams;
            const cid = parseInt(id);
            if (Number.isNaN(cid) || cid < 0 || cid >= MAX_AYAT) {
              return RESPONSE_404();
            }
            const ayat = AyatRepo.get(cid);
            const cache = ayat.cache;
            let path;
            if (cache == null) {
              const promise = new Promise((resolve, reject) => {
                const path = getCachePath(`${id}.mp3`);
                // deno-lint-ignore no-explicit-any
                (async (resolve, reject, path, rawPath, id) => {
                  try {
                    const info = await Deno.stat(path);
                    if (info.isFile) {
                      AyatRepo.updateCache(id, path);
                      resolve(path);
                      return;
                    }
                  } catch (e) {
                    if (!(e instanceof Deno.errors.NotFound)) {
                      reject(e);
                      return;
                    }
                  }
                  try {
                    using file = await Deno.open(path, {
                      write: true,
                      create: true,
                    });
                    const res = await fetch(rawPath);
                    if (!res.ok || !res.body) {
                      reject(
                        new Error(`Failed to fetch '${rawPath}' from API`),
                      );
                      return;
                    }
                    await res.body.pipeTo(file.writable, {
                      preventClose: true,
                    });
                  } catch (e) {
                    reject(e);
                    return;
                  }
                  AyatRepo.updateCache(id, path);
                  resolve(path);
                })(resolve, reject, path, ayat.audio, cid);
              });
              AyatRepo.updateCache(cid, promise);
              try {
                path = await promise;
              } catch (e) {
                if (e instanceof Error) {
                  console.error(`Error: ${e.message}`);
                }
                return RESPONSE_500();
              }
            } else if (typeof cache == "string") {
              path = cache;
            } else {
              try {
                path = await cache;
              } catch (e) {
                if (e instanceof Error) {
                  console.error(`Error: ${e.message}`);
                }
                return RESPONSE_500();
              }
            }
            try {
              const file = await Deno.open(path, {
                read: true,
              });
              return new Response(file.readable, {
                status: 200,
                statusText: "OK",
                headers: {
                  "Content-Type": "audio/mpeg",
                },
              });
            } catch (_e) {
              return RESPONSE_500();
            }
          }
        } else return RESPONSE_404();
      }
      return RESPONSE_404();
    } else return RESPONSE_404();
  };
}
export { compileRoute };
