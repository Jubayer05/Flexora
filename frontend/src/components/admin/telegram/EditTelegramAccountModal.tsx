'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { showError } from '@/lib/errMsg';
import requests from '@/services/network/http';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface TelegramAccount {
  id: number;
  phone?: string | null;
  meta?: {
    phone?: string;
    proxy?: {
      host: string;
      port: number;
      type: string;
      username?: string;
      password?: string;
    };
    [key: string]: any;
  };
  [key: string]: any;
}

interface TelegramAccountCredentials {
  phone?: string;
  email?: string;
  username?: string;
  password?: string;
}

interface EditTelegramAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: TelegramAccount;
  onSuccess?: () => void;
}

export function EditTelegramAccountModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: EditTelegramAccountModalProps) {
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    username: '',
    password: '',
  });
  const [proxyData, setProxyData] = useState({
    host: '',
    port: '',
    type: 'SOCKS5',
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasTwoFactorEnabled, setHasTwoFactorEnabled] = useState(false);

  const fetchCredentials = async () => {
    setIsLoading(true);
    try {
      const response = await requests.get<{
        data: TelegramAccountCredentials;
      }>(`/admin/telegram-accounts/${account.id}/credentials`);

      const credentials = response.data;
      setHasTwoFactorEnabled(Boolean(credentials?.password));

      // Handle both existing credentials and empty/null responses
      setFormData({
        phone: credentials?.phone || account.phone || account.meta?.phone || '',
        email: credentials?.email || '',
        username: credentials?.username || '',
        password: '', // Never pre-fill password
      });

      // Load proxy data from meta
      if (account.meta?.proxy) {
        setProxyData({
          host: account.meta.proxy.host || '',
          port: account.meta.proxy.port?.toString() || '',
          type: account.meta.proxy.type || 'SOCKS5',
          username: account.meta.proxy.username || '',
          password: '', // Never pre-fill password
        });
      }
    } catch (err: any) {
      // Don't show error for missing credentials, just use empty form
      console.warn('Could not fetch credentials, using empty form:', err);
      setHasTwoFactorEnabled(false);
      setFormData({
        phone: account.phone || account.meta?.phone || '',
        email: '',
        username: '',
        password: '',
      });

      // Load proxy data even if credentials fail
      if (account.meta?.proxy) {
        setProxyData({
          host: account.meta.proxy.host || '',
          port: account.meta.proxy.port?.toString() || '',
          type: account.meta.proxy.type || 'SOCKS5',
          username: account.meta.proxy.username || '',
          password: '',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch credentials when modal opens
  useEffect(() => {
    if (open) {
      fetchCredentials();
    } else {
      // Reset form when modal closes
      setFormData({
        phone: '',
        email: '',
        username: '',
        password: '',
      });
      setProxyData({
        host: '',
        port: '',
        type: 'SOCKS5',
        username: '',
        password: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, account.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Update credentials
      await requests.put(`/admin/telegram-accounts/${account.id}`, formData);

      // Update proxy if host and port are provided
      if (proxyData.host && proxyData.port) {
        await requests.patch(`/admin/telegram-accounts/${account.id}/proxy`, {
          host: proxyData.host,
          port: parseInt(proxyData.port),
          type: proxyData.type,
          username: proxyData.username || undefined,
          password: proxyData.password || undefined,
        });
      } else if (!proxyData.host && !proxyData.port && account.meta?.proxy) {
        // Remove proxy if cleared
        await requests.delete(`/admin/telegram-accounts/${account.id}/proxy`);
      }

      toast.success('Telegram account updated successfully');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      showError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Telegram Account</DialogTitle>
          <DialogDescription>Update the details for this Telegram account.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Credentials Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Account Credentials</h3>
                  <div
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      hasTwoFactorEnabled
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-muted-foreground/20 bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    2FA {hasTwoFactorEnabled ? 'Enabled' : 'Not Enabled'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="text"
                    placeholder="+1234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="@username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Update 2FA Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Leave empty to keep current 2FA password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use this when Telegram 2FA changes and you need to save the updated 2FA for the client.
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Proxy Configuration Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Proxy Configuration</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty to use global IP Royal config or no proxy
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="proxy-host">Host</Label>
                    <Input
                      id="proxy-host"
                      type="text"
                      placeholder="proxy.iproyal.com"
                      value={proxyData.host}
                      onChange={(e) => setProxyData({ ...proxyData, host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proxy-port">Port</Label>
                    <Input
                      id="proxy-port"
                      type="number"
                      placeholder="32325"
                      value={proxyData.port}
                      onChange={(e) => setProxyData({ ...proxyData, port: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-type">Type</Label>
                  <Select
                    value={proxyData.type}
                    onValueChange={(value) => setProxyData({ ...proxyData, type: value })}
                  >
                    <SelectTrigger id="proxy-type">
                      <SelectValue placeholder="Select proxy type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOCKS5">SOCKS5</SelectItem>
                      <SelectItem value="HTTP">HTTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-username">Username (Optional)</Label>
                  <Input
                    id="proxy-username"
                    type="text"
                    placeholder="proxy_username"
                    value={proxyData.username}
                    onChange={(e) => setProxyData({ ...proxyData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proxy-password">Password (Optional)</Label>
                  <Input
                    id="proxy-password"
                    type="password"
                    placeholder="Leave empty to keep current"
                    value={proxyData.password}
                    onChange={(e) => setProxyData({ ...proxyData, password: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
