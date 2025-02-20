const router = require("express").Router();
const MeController = require("../controllers/MeController");

const meRouter = () =>{
    const meController = new MeController();  
    router.get("/profile", meController.profile);
    router.put('/profile', meController.updateProfile);
    return router;
}

module.exports = meRouter;