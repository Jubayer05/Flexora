import { redirect } from "next/navigation";

export default function PaymentSettingsPage() {
    return redirect('/admin/payment-settings/payment-gateways')
}