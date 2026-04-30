import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import walletRouter from "./wallet.js";
import agentsRouter from "./agents.js";
import rentalsRouter from "./rentals.js";
import tradesRouter from "./trades.js";
import notificationsRouter from "./notifications.js";
import dashboardRouter from "./dashboard.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(walletRouter);
router.use(agentsRouter);
router.use(rentalsRouter);
router.use(tradesRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
