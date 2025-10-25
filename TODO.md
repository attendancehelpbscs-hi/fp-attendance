# TODO: Fix Student Update 422 Error

## Current Issue
- 422 Unprocessable Entity error when updating student via `/api/student/{id}`
- Joi validation fails due to mismatch between schema (optional) and controller expectations (required)

## Steps to Complete
- [ ] Update `updateStudentSchema` in `bio-attendance-sys-master/server/src/joi/student.joi.ts` to make `courses` and `fingerprint` required
- [ ] Test student update functionality to ensure no more 422 errors
- [ ] Verify client sends required fields in update requests

## Status
- [x] Analysis completed
- [x] Plan approved by user
- [x] Implementation completed - Updated updateStudentSchema to require fingerprint and courses, added .unknown(true) to allow extra fields like id and url
- [ ] Testing required - Verify student update works without 422 errors
