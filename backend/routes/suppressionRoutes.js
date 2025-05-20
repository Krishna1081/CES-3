const express = require("express");
const router = express.Router();
const {
  addEmailToSuppression,
  getSuppressedEmails,
  removeEmailFromSuppression,
  unsubscribeViaLink,
} = require("../controllers/suppresionController");

router.post("/api/suppression/:email", addEmailToSuppression);
router.get("/api/suppression", getSuppressedEmails);
router.delete("/api/suppression/:email", removeEmailFromSuppression);

module.exports = router;
