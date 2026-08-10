import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { validatePassword } from '@/lib/validation';
import { PasswordChecklist } from '@/components/PasswordChecklist';

export function AccountInformation() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Account deletion state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deletePassword, setDeletePassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Enter your current password');
      return;
    }

    // Client-side policy check (also enforced server-side in auth settings).
    const pwError = validatePassword(newPassword);
    if (pwError) {
      setPasswordError(pwError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setSaving(true);

    // Verify the current password before allowing a change.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    });
    if (verifyError) {
      setPasswordError('Current password is incorrect');
      setSaving(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      toast.success('Password updated successfully');
      setIsChangingPassword(false);
      clearPasswordFields();
    }
    setSaving(false);
  };

  const clearPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const handleCancel = () => {
    setIsChangingPassword(false);
    clearPasswordFields();
  };

  const resetDeleteFlow = () => {
    setDeleteStep(1);
    setDeletePassword('');
    setOtpCode('');
    setDeleteError(null);
    setDeleting(false);
  };

  const handleConfirmDeletePassword = async () => {
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError('Enter your password');
      return;
    }
    setDeleting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: deletePassword,
    });
    if (error) {
      setDeleteError('Password is incorrect');
      setDeleting(false);
      return;
    }
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: user?.email ?? '',
      options: { shouldCreateUser: false },
    });
    setDeleting(false);
    if (otpError) {
      setDeleteError(otpError.message);
      return;
    }
    setDeleteStep(2);
    toast.success('Verification code sent to your email');
  };

  const handleConfirmDeleteCode = async () => {
    setDeleteError(null);
    if (otpCode.trim().length < 6) {
      setDeleteError('Enter the 6-digit code from your email');
      return;
    }
    setDeleting(true);
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: user?.email ?? '',
      token: otpCode.trim(),
      type: 'email',
    });
    if (otpError) {
      setDeleteError('That code is invalid or expired');
      setDeleting(false);
      return;
    }

    const { error: fnError } = await supabase.functions.invoke('delete-account');
    if (fnError) {
      setDeleteError('Failed to delete account. Please try again.');
      setDeleting(false);
      return;
    }

    await signOut();
    setDeleteOpen(false);
    navigate('/account-deleted', { replace: true });
  };

  return (
    <div className="space-y-6">
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-2 text-primary mb-4">
        <h2 className="font-display text-xl">ACCOUNT INFORMATION</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={user?.email || ''}
            disabled
            className="bg-muted text-muted-foreground cursor-not-allowed"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          {!isChangingPassword ? (
            <div className="flex gap-3">
              <Input
                id="password"
                type="password"
                value="••••••••"
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setIsChangingPassword(true)}
              >
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordChecklist value={newPassword} />
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-destructive text-xs font-display">{passwordError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={saving || !currentPassword || !newPassword || !confirmPassword}
                >
                  {saving ? 'Saving...' : 'Update Password'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Delete account */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-foreground mb-4">
          <h2 className="font-display text-xl">DELETE ACCOUNT</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Permanently deletes your account and all associated data. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          onClick={() => {
            resetDeleteFlow();
            setDeleteOpen(true);
          }}
        >
          Delete My Account
        </Button>
      </div>

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) resetDeleteFlow();
        }}
      >
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl tracking-wide">
              {deleteStep === 1 ? 'STEP 1 OF 2: CONFIRM PASSWORD' : 'STEP 2 OF 2: CHECK YOUR EMAIL'}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 1
                ? 'Enter your current password to continue. This action is permanent.'
                : `Enter the 6-digit code we sent to ${user?.email}.`}
            </DialogDescription>
          </DialogHeader>

          {deleteStep === 1 ? (
            <div className="space-y-3">
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Current password"
              />
              {deleteError && <p className="text-destructive text-xs font-display">{deleteError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDeletePassword} disabled={deleting}>
                  {deleting ? 'Verifying...' : 'Continue'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
              />
              {deleteError && <p className="text-destructive text-xs font-display">{deleteError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleConfirmDeleteCode} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
