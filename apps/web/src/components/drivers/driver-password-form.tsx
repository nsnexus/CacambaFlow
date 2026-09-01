'use client';

import { updateDriverPassword } from '@/app/actions/drivers';
import { ChangePasswordForm } from '@/components/ui/change-password-form';

export function DriverPasswordForm({ driverId }: { driverId: string }) {
  return <ChangePasswordForm action={updateDriverPassword.bind(null, driverId)} idPrefix="driver" />;
}
