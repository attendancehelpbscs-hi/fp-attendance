import { Router } from 'express';
import { registerStaff, updateSettings, getSettings, backupDataController, clearAuditLogsController, updateProfile } from '../controllers/staff.controller';
import { registerStaffSchema } from '../joi/staff.joi';
import joiValidate from '../middlewares/joi.middleware';
import auth from '../middlewares/auth.middleware';

const staffRoute = Router();

/*
@route          POST /api/staff/register (register staff)
@description    Register a new staff.
@access         Public
*/

staffRoute.post('/staff/register', joiValidate(registerStaffSchema), registerStaff);

/*
@route          PUT /api/staff/settings (update staff settings)
@description    Update staff attendance settings.
@access         Private
*/
staffRoute.put('/staff/settings', auth, updateSettings);

/*
@route          GET /api/staff/settings (get staff settings)
@description    Get staff attendance settings.
@access         Private
*/
staffRoute.get('/staff/settings', auth, getSettings);

/*
@route          POST /api/staff/backup (backup data)
@description    Backup all system data to a file.
@access         Private
*/
staffRoute.post('/staff/backup', auth, backupDataController);

/*
@route          PUT /api/staff/profile (update staff profile)
@description    Update staff name and/or password.
@access         Private
*/
staffRoute.put('/staff/profile', auth, updateProfile);

/*
@route          DELETE /api/staff/clear-logs (clear audit logs)
@description    Clear all audit logs.
@access         Private
*/
staffRoute.delete('/staff/clear-logs', auth, clearAuditLogsController);

export default staffRoute;
