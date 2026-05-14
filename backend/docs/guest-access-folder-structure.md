# Guest Access Folder Structure Suggestion

## Backend
```
src/
  controllers/
    guestAccess.controller.ts
  routes/
    guestAccess.route.ts
  middlewares/
    guestAuth.ts
  emailTemplates/
    guestAccessCodeEmail.ts
  prisma/
    schema.prisma (GuestAccess model)
  docs/
    guest-access-security.md
    guest-access-folder-structure.md
```

## Frontend
```
src/
  app/
    (front)/
      guest/
        access/         # code entry & verification
        order-details/  # view order after verification
```
