import { Router } from "express";
import Notification from "../models/notification.js";
const router = Router();

// POST /api/notifications -- admin create notification for users/all
router.post("/", async (req, res) => {
  const { userIds, message, link } = req.body;
  const notif = await Notification.create({ userIds, message, link, readBy: [] });
  res.json(notif);
});

// GET /api/notifications?userId=xxx -- get user's notifications (all/broadcast)
router.get("/", async (req, res) => {
  const { userId } = req.query;
  const notifs = await Notification.find({
    $or: [{ userIds: userId }, { userIds: "all" }]
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
