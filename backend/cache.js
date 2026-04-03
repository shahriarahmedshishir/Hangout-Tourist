const redis = require("redis");

let client;
let redisConnected = false;

// Fallback in-memory cache for development (when Redis is not available)
const memoryCache = new Map();

async function initCache() {
  if (client || !redisConnected) return client;

  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    client.on("error", (err) => {
      console.warn(
        "⚠️  Redis connection failed. Using in-memory cache instead.",
      );
      redisConnected = false;
      client = null;
    });

    client.on("connect", () => {
      console.log("✅ Redis connected");
      redisConnected = true;
    });

    await client.connect();
    redisConnected = true;
    return client;
  } catch (err) {
    console.warn("⚠️  Redis unavailable. Using in-memory cache instead.");
    redisConnected = false;
    client = null;
    return null;
  }
}

async function getCache(key) {
  try {
    const client = await initCache();
    if (client) {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    }

    // Fallback to memory cache
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }
    if (cached) memoryCache.delete(key);
    return null;
  } catch (err) {
    console.warn("Cache get error:", err.message);
    return null;
  }
}

async function setCache(key, value, ttl = 300) {
  try {
    const client = await initCache();
    if (client) {
      await client.setEx(key, ttl, JSON.stringify(value));
    } else {
      // Fallback to memory cache
      memoryCache.set(key, {
        value,
        expiry: Date.now() + ttl * 1000,
      });
    }
  } catch (err) {
    console.warn("Cache set error:", err.message);
  }
}

async function delCache(key) {
  try {
    const client = await initCache();
    if (client) {
      await client.del(key);
    } else {
      memoryCache.delete(key);
    }
  } catch (err) {
    console.warn("Cache delete error:", err.message);
  }
}

async function clearCache(pattern) {
  try {
    const client = await initCache();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (err) {
    console.warn("Cache clear error:", err.message);
  }
}

module.exports = { initCache, getCache, setCache, delCache, clearCache };
