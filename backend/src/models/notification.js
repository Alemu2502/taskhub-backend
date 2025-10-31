import mongoose from "mongoose";
const { Schema, model } = mongoose;

const NotificationSchema = new Schema({
  userIds: [{ type: String }], // list of user ids or "all"
  message: { type: String, required: true },
  link: String,
  readBy: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

export default model("Notification", NotificationSchema);
