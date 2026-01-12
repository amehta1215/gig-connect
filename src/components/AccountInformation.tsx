import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

export function AccountInformation() {
  const { user } = useAuth();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      toast.error('Failed to update password');
    } else {
      toast.success('Password updated successfully');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setIsChangingPassword(false);
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
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
                  disabled={saving || !newPassword || !confirmPassword}
                >
                  {saving ? 'Saving...' : 'Update Password'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
