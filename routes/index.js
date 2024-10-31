const express = require("express");
const router = express.Router();

// Require controller modules.

router.get("/", function (req, res) {
    res.redirect("/catalog");
});

module.exports = router;