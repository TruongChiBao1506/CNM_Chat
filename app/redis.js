const util = require("util");
const redis = require("redis");
// 6379
// const client = redis.createClient({
//   host: process.env.REDIS_HOST,
//   port: process.env.REDIS_PORT,
// });

const client = redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

client.on("connect", function () {
  console.log("Redis Connected!");
});

client.on("error", function (error) {
  console.error("Redis Error: ", error);
});
// Kết nối Redis
(async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error("Redis Connection Error:", error);
  }
})();
// Hàm lưu dữ liệu vào Redis
const set = async (key, value) => {
  try {
    await client.set(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Redis SET Error: ${error}`);
  }
};

// Hàm lấy dữ liệu từ Redis
const get = async (key) => {
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Redis GET Error: ${error}`);
    return null;
  }
};

// Hàm kiểm tra key có tồn tại trong Redis không
const exists = async (key) => {
  try {
    const isExists = await client.exists(key);
    return isExists === 1;
  } catch (error) {
    console.error(`Redis EXISTS Error: ${error}`);
    return false;
  }
};

module.exports = {
  set,
  get,
  exists,
};
