import { Router } from 'express';
import { getAuditLogsController, createAuditLogController } from '../controllers/audit.controller';
import auth from '../middlewares/auth.middleware';

const router = Router();

router.get('/audit/logs', auth as any, getAuditLogsController);
router.post('/audit/log', auth as any, createAuditLogController);

export default router;
