import { Router } from "express";
import Notification from "../models/notification.js";
const router = Router();

// POST /api/notifications -- Admin creates notification for one, some, or all users
router.post("/", async (req, res) => {
  const { userIds, message, link } = req.body;
  // userIds: array of user IDs or ["all"]
  const notif = await Notification.create({ userIds, message, link, readBy: [] });
  res.json(notif);
});

// GET /api/notifications?userId=xxx -- get notifications for this user (all/broadcast)
router.get("/", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: "Missing userId" });
  // find notifications where:
  //   - userIds: includes this userId
  //   - OR userIds: includes "all"
  const notifs = await Notification.find({
    $or: [
      { userIds: "all" },
      { userIds: userId }
    ]
  }).sort({ createdAt: -1 });
  res.json(notifs);
});

// POST /api/notifications/:id/read -- mark as read
router.post("/:id/read", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  await Notification.findByIdAndUpdate(id, { $addToSet: { readBy: userId } });
  res.json({ success: true });
});

export default router;
