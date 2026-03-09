import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
} from "lucide-react-native";
import { usePayments } from "@/hooks/use-client-data";
import type { Payment } from "@/types/api";

type FilterStatus = "all" | "paid" | "pending" | "overdue";

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  paid: {
    icon: CheckCircle,
    color: "#059669",
    bg: "bg-green-50",
    label: "Paid",
  },
  pending: {
    icon: Clock,
    color: "#f59e0b",
    bg: "bg-yellow-50",
    label: "Pending",
  },
  overdue: {
    icon: AlertTriangle,
    color: "#ef4444",
    bg: "bg-red-50",
    label: "Overdue",
  },
  cancelled: {
    icon: XCircle,
    color: "#6b7280",
    bg: "bg-gray-50",
    label: "Cancelled",
  },
};

export default function PaymentsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading } = usePayments();
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["payments"] });
    setRefreshing(false);
  }, [queryClient]);

  const filteredPayments = useMemo(() => {
    if (!data?.payments) return [];
    const sorted = [...data.payments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (filter === "all") return sorted;
    return sorted.filter((p) => p.status === filter);
  }, [data?.payments, filter]);

  const summary = data?.summary;

  const formatCurrency = useCallback(
    (amount: number, currency: string) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    []
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Payments</Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#059669"
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#059669" />
          </View>
        ) : (
          <>
            {/* Summary cards */}
            {summary && (
              <View className="flex-row px-4 pt-4" style={{ gap: 8 }}>
                <SummaryCard
                  label="Paid"
                  amount={summary.totalPaid}
                  color="#059669"
                  bgClass="bg-green-50"
                />
                <SummaryCard
                  label="Pending"
                  amount={summary.totalPending}
                  color="#f59e0b"
                  bgClass="bg-yellow-50"
                />
                <SummaryCard
                  label="Overdue"
                  amount={summary.totalOverdue}
                  color="#ef4444"
                  bgClass="bg-red-50"
                />
              </View>
            )}

            {/* Filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-4 pt-4 pb-2"
            >
              {(["all", "paid", "pending", "overdue"] as FilterStatus[]).map(
                (f) => (
                  <TouchableOpacity
                    key={f}
                    className={`mr-2 px-4 py-1.5 rounded-full ${
                      filter === f
                        ? "bg-brand-600"
                        : "bg-white border border-gray-200"
                    }`}
                    onPress={() => setFilter(f)}
                  >
                    <Text
                      className={`text-sm font-medium capitalize ${
                        filter === f ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>

            {/* Payment list */}
            <View className="px-4 pt-2">
              {filteredPayments.length === 0 ? (
                <View className="items-center py-16">
                  <CreditCard size={48} color="#d1d5db" />
                  <Text className="text-gray-400 mt-3 text-base">
                    No payments found
                  </Text>
                </View>
              ) : (
                filteredPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    formatCurrency={formatCurrency}
                  />
                ))
              )}
            </View>
            <View className="h-8" />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  amount,
  color,
  bgClass,
}: {
  label: string;
  amount: number;
  color: string;
  bgClass: string;
}) {
  return (
    <View
      className={`flex-1 rounded-xl p-3 items-center ${bgClass} border border-gray-100`}
    >
      <Text className="text-lg font-bold" style={{ color }}>
        {amount > 0 ? `$${amount.toFixed(0)}` : "$0"}
      </Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}

function PaymentCard({
  payment,
  formatCurrency,
}: {
  payment: Payment;
  formatCurrency: (amount: number, currency: string) => string;
}) {
  const config = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <View className="bg-white rounded-xl p-4 mb-2 border border-gray-100 flex-row items-center">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${config.bg}`}
      >
        <Icon size={20} color={config.color} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">
          {formatCurrency(payment.amount, payment.currency)}
        </Text>
        <Text className="text-sm text-gray-500">
          {payment.description || payment.period || "Payment"}
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {new Date(payment.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {payment.dueDate &&
            payment.status !== "paid" &&
            ` · Due ${new Date(payment.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}`}
        </Text>
      </View>
      <View
        className="rounded-full px-2.5 py-1"
        style={{ backgroundColor: `${config.color}15` }}
      >
        <Text
          className="text-xs font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </Text>
      </View>
    </View>
  );
}
