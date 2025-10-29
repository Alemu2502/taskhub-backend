import cron from "node-cron";
import User from "../models/user.js"; // adjust the path as needed

export function startUnverifiedUserCleanup() {
//   // Runs every hour at minute 5 (e.g. 01:05, 02:05, 03:05, ...)
  cron.schedule("5 * * * *", async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      const result = await User.deleteMany({
        isVerified: false,
        createdAt: { $lte: twentyFourHoursAgo }
      });
      if (result.deletedCount > 0) {
        console.log(`[UNVERIFIED CLEANUP] Deleted ${result.deletedCount} unverified users older than 24h`);
      }
    } catch (error) {
      console.error(`[UNVERIFIED CLEANUP] Error deleting unverified users:`, error);
    }
  });
}
//for testing purposes only
// cron.schedule("*/10 * * * * *", async () => {
//   const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
//   try {
//     const result = await User.deleteMany({
//       isVerified: false,
//       createdAt: { $lte: tenSecondsAgo }
//     });
//     if (result.deletedCount >= 0) {
//       console.log(`[UNVERIFIED CLEANUP] Deleted unverified users older than 10 seconds`);
//     }
//     if (result.deletedCount > 0) {
//       console.log(`[UNVERIFIED CLEANUP] Deleted ${result.deletedCount} unverified users older than 10 seconds`);
//       console.log(`[UNVERIFIED CLEANUP] Deleted unverified users older than 10 seconds`);
//     }
//   } catch (error) {
//     console.error(`[UNVERIFIED CLEANUP] Error deleting unverified users:`, error);
//   }
// });  
