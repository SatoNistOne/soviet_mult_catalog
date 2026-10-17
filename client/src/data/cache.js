const DB_NAME = 'mult-cache';
const LIMITS = { api: 300, img: 500 };

let dbPromise = null;

function openDb() {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = () => {
                for (const store of Object.keys(LIMITS)) {
                    request.result.createObjectStore(store).createIndex('ts', 'ts');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }).catch((error) => {
            dbPromise = null;
            throw error;
        });
    }
    return dbPromise;
}

function promisify(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function cacheGet(store, key) {
    try {
        const db = await openDb();
        return (await promisify(db.transaction(store).objectStore(store).get(key))) || null;
    } catch {
        return null;
    }
}

const writesSinceTrim = { api: 0, img: 0 };

export async function cachePut(store, key, value) {
    try {
        const db = await openDb();
        await promisify(db.transaction(store, 'readwrite').objectStore(store).put({ value, ts: Date.now() }, key));
        if (++writesSinceTrim[store] >= 25) {
            writesSinceTrim[store] = 0;
            await trim(db, store);
        }
    } catch {
    }
}

async function trim(db, store) {
    const os = db.transaction(store, 'readwrite').objectStore(store);
    const excess = (await promisify(os.count())) - LIMITS[store];
    if (excess <= 0) return;
    let removed = 0;
    const cursorRequest = os.index('ts').openCursor();
    cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor || removed >= excess) return;
        cursor.delete();
        removed += 1;
        cursor.continue();
    };
}

export async function cacheClear() {
    try {
        const db = await openDb();
        for (const store of Object.keys(LIMITS)) {
            await promisify(db.transaction(store, 'readwrite').objectStore(store).clear());
        }
    } catch {
    }
}

export async function cacheStats() {
    try {
        const db = await openDb();
        const result = {};
        for (const store of Object.keys(LIMITS)) {
            result[store] = await promisify(db.transaction(store).objectStore(store).count());
        }
        return result;
    } catch {
        return { api: 0, img: 0 };
    }
}
