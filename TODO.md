# TODO: Update Staff Profile with First Name, Last Name, and Profile Picture

## Database Changes
- [x] Update Prisma schema to add firstName, lastName, profilePicture fields to Staff model
- [x] Generate and run Prisma migration

## Backend Changes
- [x] Update server interfaces for staff to include new fields
- [x] Update staff service to handle new fields
- [x] Update staff controller to handle profile picture file upload
- [x] Update Joi validation schemas
- [x] Update API interfaces on client side

## Frontend Changes
- [x] Update store interfaces to include firstName, lastName, profilePicture
- [x] Update Settings.tsx to have separate First Name and Last Name inputs
- [x] Add profile picture upload functionality in Settings.tsx
- [x] Update API calls to handle new fields
- [x] Handle file upload in the form submission

## Testing
- [x] Test profile update with new fields
- [x] Test profile picture upload and display
- [x] Verify backward compatibility with existing data
