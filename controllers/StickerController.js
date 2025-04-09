const stickerService = require("../services/StickerService");
const redisDb = require("../app/redis");

class StickerController {
  async getAll(req, res, next) {
    try {  
      let stickers = await redisDb.get("stickers");
      if (!stickers || stickers.length === 0) {
        stickers = await stickerService.getAll();
        await redisDb.set("stickers", stickers);
      }

      res.json(stickers);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StickerController();
