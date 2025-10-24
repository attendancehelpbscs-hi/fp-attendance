import { Router } from 'express';
import { getAuditLogsController } from '../controllers/audit.controller';
import auth from '../middlewares/auth.middleware';

const router = Router();

router.get('/audit/logs', auth as any, getAuditLogsController);

export default router;
