'use client';

import { Check, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ActionItem, ActionsDropdown } from '@/components/admin/common/ActionsDropdown';
import CustomInput from '@/components/common/CustomInput';
import { CustomSelect } from '@/components/common/CustomSelect';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useConfirmationModal } from '@/hooks/useConfirmationModal';
import { showError } from '@/lib/errMsg';
import { cn } from '@/lib/utils';
import requests from '@/services/network/http';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface TableColumn<T = any> {
  key: string;
  header: string | React.ReactNode;
  render?: (value: any, data: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
}

interface Withdrawal {
  id: number;
  userId: number;
  amount: number;
  method: string;
  status: 'PENDING' | 'DONE';
  meta?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const ActionsCell = ({ data, mutate }: { data: Withdrawal; mutate?: () => void }) => {
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: data.amount.toString(),
    method: data.method,
    status: data.status,
    meta: JSON.stringify(data.meta || {}, null, 2),
  });

  const markDoneModal = useConfirmationModal({
    title: 'Mark Withdrawal as Completed',
    description: 'Are you sure you want to mark this withdrawal as completed?',
    confirmText: 'Yes, Mark as Done',
    cancelText: 'Cancel',
    variant: 'default',
    icon: CheckCircle,
  });

  const deleteModal = useConfirmationModal({
    title: 'Delete Withdrawal Request',
    description:
      'Are you sure you want to delete this withdrawal request? This action cannot be undone.',
    confirmText: 'Yes, Delete',
    cancelText: 'Cancel',
    variant: 'destructive',
    icon: Trash2,
  });

  const handleMarkDone = async () => {
    try {
      await requests.put(`/admin/withdrawals/${data.id}`, {
        status: 'DONE',
      });
      toast.success('Withdrawal marked as done');
      mutate?.();
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const handleDelete = async () => {
    try {
      await requests.delete(`/admin/withdrawals/${data.id}`);
      toast.success('Withdrawal deleted successfully');
      mutate?.();
    } catch (error) {
      showError(error);
      throw error;
    }
  };

  const handleEdit = async () => {
    try {
      let meta: Record<string, any> = {};
      if (editForm.meta.trim()) {
        try {
          meta = JSON.parse(editForm.meta);
        } catch {
          toast.error('Invalid JSON format for meta details');
          return;
        }
      }

      await requests.put(`/admin/withdrawals/${data.id}`, {
        amount: parseFloat(editForm.amount),
        method: editForm.method,
        status: editForm.status,
        meta,
      });

      toast.success('Withdrawal updated successfully');
      setEditDialog(false);
      mutate?.();
    } catch (error) {
      showError(error);
    }
  };

  const actions: ActionItem<Withdrawal>[] = [
    {
      type: 'action',
      label: 'Edit Details',
      icon: Edit,
      onClick: async () => {
        setEditDialog(true);
      },
    },
    ...(data.status === 'PENDING'
      ? [
          {
            type: 'action' as const,
            label: 'Mark as Done',
            icon: Check,
            onClick: async () => {
              markDoneModal.openModal(async () => {
                await handleMarkDone();
              });
            },
          },
        ]
      : []),
    {
      type: 'action' as const,
      label: 'Delete',
      icon: Trash2,
      onClick: async () => {
        deleteModal.openModal(async () => {
          await handleDelete();
        });
      },
      className: 'text-red-500 focus:text-red-500',
    },
  ];

  return (
    <>
      <ActionsDropdown data={data} actions={actions} />
      <markDoneModal.ModalComponent />
      <deleteModal.ModalComponent />

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Withdrawal</DialogTitle>
            <DialogDescription>Update withdrawal request details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <CustomInput
                type="number"
                step="0.01"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <CustomInput
                value={editForm.method}
                onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <CustomSelect
                value={editForm.status}
                onChange={(value) => setEditForm({ ...editForm, status: value as any })}
                showSearch={false}
                staticOptions={[
                  { label: 'Pending', value: 'PENDING', title: 'Pending' },
                  { label: 'Done', value: 'DONE', title: 'Done' },
                ]}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'N/A';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'DONE':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const renderMetaInfo = (meta?: Record<string, any>) => {
  if (!meta || Object.keys(meta).length === 0)
    return <span className="text-muted-foreground">N/A</span>;

  return (
    <div className="space-y-1 text-xs max-w-xs">
      {Object.entries(meta)
        .slice(0, 3)
        .map(([key, value]) => (
          <div key={key} className="truncate">
            <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}: </span>
            <span className="text-foreground">{String(value)}</span>
          </div>
        ))}
      {Object.keys(meta).length > 3 && (
        <div className="text-muted-foreground">+{Object.keys(meta).length - 3} more</div>
      )}
    </div>
  );
};

export const withdrawalColumns = (mutate?: () => void): TableColumn<Withdrawal>[] => [
  {
    key: 'id',
    header: 'ID',
    width: '80px',
    render: (_, data) => <span className="text-primary font-medium">#{data.id}</span>,
  },
  {
    key: 'user',
    header: 'Customer',
    width: '200px',
    render: (_, data) => (
      <div className="space-y-1">
        <div className="font-medium text-foreground">
          {data.user?.firstName || data.user?.lastName
            ? `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim()
            : 'N/A'}
        </div>
        <div className="text-xs text-muted-foreground">{data.user?.email || 'N/A'}</div>
        <div className="text-xs text-muted-foreground">ID: {data.userId}</div>
      </div>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    width: '120px',
    render: (_, data) => (
      <span className="font-semibold text-primary">
        ${parseFloat(data.amount.toString()).toFixed(2)}
      </span>
    ),
  },
  {
    key: 'method',
    header: 'Method',
    width: '150px',
    render: (_, data) => <span className="text-foreground">{data.method}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    width: '120px',
    render: (_, data) => (
      <span
        className={cn(
          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
          getStatusColor(data.status)
        )}
      >
        {data.status}
      </span>
    ),
  },
  {
    key: 'meta',
    header: 'Details',
    width: '250px',
    render: (_, data) => renderMetaInfo(data.meta),
  },
  {
    key: 'createdAt',
    header: 'Created',
    width: '160px',
    render: (_, data) => (
      <span className="text-muted-foreground text-sm">{formatDate(data.createdAt)}</span>
    ),
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    width: '160px',
    render: (_, data) => (
      <span className="text-muted-foreground text-sm">{formatDate(data.updatedAt)}</span>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    width: '80px',
    className: 'text-right',
    render: (_, data) => <ActionsCell data={data} mutate={mutate} />,
  },
];
