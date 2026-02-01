
# Plan: Redirect New Users to Profile Edit Page After Signup

## Overview
After a new user signs up and verifies their email, they should be automatically redirected to their profile edit page instead of the main dashboard. This helps ensure new users complete their profile setup before exploring the app.

**Routing logic:**
- Artist or "Both" role → `/artist/profile`
- Venue role → `/venue/profile`

---

## Implementation Steps

### 1. Track New User Status in AuthContext
Add state and logic to detect when a user is signing in for the first time after account creation.

**Changes to `src/contexts/AuthContext.tsx`:**
- Add `isNewUser` boolean state
- Update `onAuthStateChange` to detect the `SIGNED_IN` event with email confirmation (this happens when users click the verification link)
- Expose `isNewUser` and a `clearNewUserFlag` function in the context

### 2. Update SignUp Page Redirect Logic
Modify the redirect logic in `SignUp.tsx` to send new users to the profile edit page.

**Changes to `src/pages/SignUp.tsx`:**
- Update the `useEffect` that handles post-login redirect
- Check `isNewUser` flag and redirect accordingly:
  - If role is "venue" → `/venue/profile`
  - If role is "artist" or "both" → `/artist/profile`
- Clear the new user flag after redirect

### 3. Update Login Page Redirect Logic  
Ensure the Login page also handles the case where a new user verifies their email and returns to the app via the login flow.

**Changes to `src/pages/Login.tsx`:**
- Add similar `isNewUser` check to redirect new users to profile pages
- Clear the flag after navigation

---

## Technical Details

### AuthContext Changes
```text
New state:
- isNewUser: boolean (tracks if this is a first-time login)

New exports:
- isNewUser
- clearNewUserFlag: () => void

Detection method:
- Check if auth event is triggered with a user whose 
  profile was just created (use created_at timestamp
  comparison or store flag in localStorage temporarily)
```

### Redirect Flow
```text
User signs up → Email sent → User clicks verification link
                                    ↓
                           Returns to app at "/"
                                    ↓
                    onAuthStateChange fires (SIGNED_IN)
                                    ↓
                    isNewUser flag set to true
                                    ↓
                    SignUp/Login useEffect runs
                                    ↓
                    Checks isNewUser + role
                                    ↓
         ┌──────────────────────────┴──────────────────────────┐
         ↓                                                      ↓
    role="venue"                                    role="artist" or "both"
         ↓                                                      ↓
  /venue/profile                                        /artist/profile
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Add `isNewUser` state, detection logic, and `clearNewUserFlag` function |
| `src/pages/SignUp.tsx` | Update redirect logic to check `isNewUser` and navigate to profile pages |
| `src/pages/Login.tsx` | Add same `isNewUser` check for users who verify email then log in |

---

## Edge Cases Handled

- **User verifies email on different device**: The login page will also check for new users
- **User already has completed profile**: We redirect to profile anyway for first login - this is intentional for onboarding
- **"Both" role users**: Default to artist profile page (matching existing behavior where "both" defaults to artist dashboard)
