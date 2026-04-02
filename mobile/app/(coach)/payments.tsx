import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react-native";
import { useCoachPayments, useCoachClients } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";
import { AppBottomSheet, BottomSheetTextInput } from "@/components/app-bottom-sheet";
import { useT } from "@/lib/i18n";
import { useThemeColors } from "@/hooks/use-theme-colors";
import type { Payment } from "@/types/api";

type StatusFilter = "all" | "pending" | "overdue" | "paid";

const METHODS = ["cash", "bank_transfer", "card", "venmo", "zelle", "other"];

export default function CoachPaymentsScreen() {
  const t = useT();
  const colors = useThemeColors();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const statusParam = filter === "all" ? undefined : filter;
  const { data, isLoading, error, refetch, isRefetching } =
    useCoachPayments(statusParam);

  const renderPayment = useCallback(
    ({ item }: { item: any }) => {
      const s = item.status?.toLowerCase();
      return (
        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5 bg-white dark:bg-slate-800 border-b border-gray-50 dark:border-slate-700/40"
          onPress={() => setEditingPayment(item)}
          activeOpacity={0.6}
        >
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
              s === "overdue"
                ? "bg-red-50 dark:bg-red-900/25"
                : s === "pending"
                ? "bg-amber-50 dark:bg-amber-900/25"
                : "bg-green-50 dark:bg-green-900/25"
            }`}
          >
            {s === "overdue" ? (
              <AlertTriangle size={16} color="#ef4444" />
            ) : s === "pending" ? (
              <Clock size={16} color="#f59e0b" />
            ) : (
              <CheckCircle size={16} color="#10b981" />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-900 dark:text-slate-50">
              {item.client?.name || "Client"}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-slate-400">
              {item.description || "Payment"}
              {item.dueDate &&
                ` · Due ${new Date(item.dueDate).toLocaleDateString()}`}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-gray-900 dark:text-slate-50">
              {item.amount?.toFixed(2)} {item.currency || ""}
            </Text>
            <View
              className={`px-1.5 py-0.5 rounded-full mt-0.5 ${
                s === "overdue"
                  ? "bg-red-50 dark:bg-red-900/25"
                  : s === "pending"
                  ? "bg-amber-50 dark:bg-amber-900/25"
                  : "bg-green-50 dark:bg-green-900/25"
              }`}
            >
              <Text
                className={`text-[10px] font-medium capitalize ${
                  s === "overdue"
                    ? "text-red-700 dark:text-red-300"
                    : s === "pending"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-green-700 dark:text-green-300"
                }`}
              >
                {item.status}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    []
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header onAdd={() => setShowAdd(true)} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
        <Header onAdd={() => setShowAdd(true)} />
        <QueryError message={t.errors.failedToLoad} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const summary = data?.summary;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950" edges={["top"]}>
      <Header onAdd={() => setShowAdd(true)} />

      {summary && (
        <View className="flex-row px-4 pb-3">
          <SummaryCard
            label={t.billing.collected}
            value={summary.totalCollected}
            color="text-green-700 dark:text-green-300"
            bg="bg-green-50 dark:bg-green-900/25"
          />
          <SummaryCard
            label={t.billing.pending}
            value={summary.totalPending}
            color="text-amber-700 dark:text-amber-300"
            bg="bg-amber-50 dark:bg-amber-900/25"
          />
          <SummaryCard
            label={t.billing.overdue}
            value={summary.totalOverdue}
            color="text-red-700 dark:text-red-300"
            bg="bg-red-50 dark:bg-red-900/25"
          />
        </View>
      )}

      <View className="flex-row px-4 pb-2">
        {(["all", "pending", "overdue", "paid"] as StatusFilter[]).map(
          (f) => (
            <TouchableOpacity
              key={f}
              className={`mr-2 px-3 py-1.5 rounded-full ${
                filter === f
                  ? "bg-brand-600"
                  : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"
              }`}
              onPress={() => setFilter(f)}
              activeOpacity={0.6}
            >
              <Text
                className={`text-xs font-medium capitalize ${
                  filter === f ? "text-white" : "text-gray-600 dark:text-slate-300"
                }`}
              >
                {f}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <FlatList
        data={data?.payments || []}
        keyExtractor={(item) => item.id}
        renderItem={renderPayment}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <CreditCard size={40} color={colors.iconMuted} />
            <Text className="text-gray-400 dark:text-slate-500 text-sm mt-3">{t.billing.noPayments}</Text>
          </View>
        }
      />

      <AddPaymentModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          setShowAdd(false);
          refetch();
        }}
      />
      {editingPayment && (
        <EditPaymentSheet
          payment={editingPayment}
          visible={!!editingPayment}
          onClose={() => setEditingPayment(null)}
        />
      )}
    </SafeAreaView>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  const t = useT();
  const colors = useThemeColors();
  return (
    <View className="flex-row items-center px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700/40 mb-4">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-2.5">
        <ArrowLeft size={22} color={colors.text} />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50 flex-1">
        {t.nav.payments}
      </Text>
      <TouchableOpacity
        onPress={onAdd}
        className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center"
        activeOpacity={0.7}
      >
        <Plus size={14} color="#fff" />
        <Text className="text-white text-xs font-semibold ml-1">{t.billing.recordPayment}</Text>
      </TouchableOpacity>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View className={`flex-1 ${bg} rounded-xl p-3 mx-1`}>
      <Text className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">{label}</Text>
      <Text className={`text-base font-bold ${color} mt-0.5`}>
        {value.toFixed(2)}
      </Text>
    </View>
  );
}

function AddPaymentModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();
  const { data: clients } = useCoachClients();
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [period, setPeriod] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(false);

  const selectedClient = clients?.find((c) => c.id === clientId);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/payments", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-payments"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
      resetForm();
      onSuccess();
    },
    onError: (err: any) => {
      Alert.alert(t.common.error, err.message || t.errors.failedToSave);
    },
  });

  const handleSubmit = () => {
    if (!clientId) {
      Alert.alert(t.common.required, t.billing.client);
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t.common.required, t.billing.amount);
      return;
    }
    createMutation.mutate({
      clientId,
      amount: parsedAmount,
      method,
      status,
      description: description.trim() || null,
      notes: notes.trim() || null,
      dueDate: dueDate.trim() || null,
      period: period.trim() || null,
    });
  };

  const resetForm = () => {
    setClientId("");
    setAmount("");
    setMethod("cash");
    setStatus("paid");
    setDescription("");
    setNotes("");
    setDueDate("");
    setPeriod("");
    setShowClientPicker(false);
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={() => { resetForm(); onClose(); }}
      snapPoints={["50%", "85%"]}
      title={t.billing.recordPayment}
      footer={
        <TouchableOpacity
          className={`rounded-lg py-3.5 items-center ${createMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          activeOpacity={0.8}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">{t.billing.recordPayment}</Text>
          )}
        </TouchableOpacity>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.billing.client}</Text>
      <TouchableOpacity
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4"
        onPress={() => setShowClientPicker(!showClientPicker)}
        activeOpacity={0.6}
      >
        <Text className={selectedClient ? "text-gray-900 dark:text-slate-50" : "text-gray-400 dark:text-slate-500"}>
          {selectedClient?.name || "Select client..."}
        </Text>
      </TouchableOpacity>

      {showClientPicker && (
        <View className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg mb-4" style={{ maxHeight: 192 }}>
          <ScrollView nestedScrollEnabled>
            {(clients || []).map((c) => (
              <TouchableOpacity
                key={c.id}
                className={`px-4 py-2.5 border-b border-gray-50 dark:border-slate-700/40 ${c.id === clientId ? "bg-brand-50 dark:bg-brand-900/20" : ""}`}
                onPress={() => { setClientId(c.id); setShowClientPicker(false); }}
              >
                <Text className="text-sm text-gray-900 dark:text-slate-50">{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.billing.amount}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="0.00"
        placeholderTextColor={colors.iconMuted}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.billing.method}</Text>
      <View className="flex-row flex-wrap mb-4">
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m}
            className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${method === m ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`}
            onPress={() => setMethod(m)}
          >
            <Text className={`text-xs font-medium capitalize ${method === m ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>
              {m.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.status}</Text>
      <View className="flex-row mb-4">
        {(["paid", "pending"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            className={`mr-2 px-4 py-2 rounded-lg ${status === s ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`}
            onPress={() => setStatus(s)}
          >
            <Text className={`text-sm font-medium capitalize ${status === s ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.description} ({t.common.optional})</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-3 text-base text-gray-900 dark:text-slate-50"
        placeholder="Monthly coaching fee..."
        placeholderTextColor={colors.iconMuted}
        value={description}
        onChangeText={setDescription}
      />

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Due Date</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.iconMuted}
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Period</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="e.g. April 2026"
            placeholderTextColor={colors.iconMuted}
            value={period}
            onChangeText={setPeriod}
          />
        </View>
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.notes} ({t.common.optional})</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="Internal notes..."
        placeholderTextColor={colors.iconMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
        style={{ minHeight: 48, textAlignVertical: "top" }}
      />
    </AppBottomSheet>
  );
}

function EditPaymentSheet({
  payment,
  visible,
  onClose,
}: {
  payment: Payment;
  visible: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const colors = useThemeColors();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState(String(payment.amount));
  const [method, setMethod] = useState(payment.method || "cash");
  const [status, setStatus] = useState(payment.status);
  const [description, setDescription] = useState(payment.description || "");
  const [notes, setNotes] = useState(payment.notes || "");
  const [dueDate, setDueDate] = useState(
    payment.dueDate ? payment.dueDate.slice(0, 10) : ""
  );
  const [period, setPeriod] = useState(payment.period || "");

  const clientId = payment.clientId || payment.client?.id;

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      api.put(`/api/clients/${clientId}/payments/${payment.id}`, data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-payments"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message || t.errors.failedToSave),
  });

  const deleteMutation = useMutation({
    mutationFn: () =>
      api.delete(`/api/clients/${clientId}/payments/${payment.id}`),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-payments"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
      onClose();
    },
    onError: (err: any) => Alert.alert(t.common.error, err.message || t.errors.failedToSave),
  });

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert(t.common.required, t.billing.amount);
      return;
    }
    updateMutation.mutate({
      amount: parsedAmount,
      method,
      status,
      description: description.trim() || null,
      notes: notes.trim() || null,
      dueDate: dueDate.trim() || null,
      period: period.trim() || null,
    });
  };

  const handleDelete = () => {
    Alert.alert("Delete Payment", "Are you sure you want to delete this payment?", [
      { text: t.common.cancel, style: "cancel" },
      { text: t.common.delete, style: "destructive", onPress: () => deleteMutation.mutate() },
    ]);
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["55%", "90%"]}
      title="Edit Payment"
      footer={
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 rounded-xl py-3.5 items-center border border-red-300 dark:border-red-700"
            onPress={handleDelete}
            disabled={deleteMutation.isPending}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center">
              <Trash2 size={16} color="#ef4444" />
              <Text className="text-red-600 font-semibold text-base ml-2">Delete</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 rounded-xl py-3.5 items-center ${updateMutation.isPending ? "bg-brand-400" : "bg-brand-600"}`}
            onPress={handleSave}
            disabled={updateMutation.isPending}
            activeOpacity={0.7}
          >
            {updateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">Save</Text>
            )}
          </TouchableOpacity>
        </View>
      }
    >
      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">
        {payment.client?.name || "Client"}
      </Text>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1 mt-3">{t.billing.amount}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-3 text-base text-gray-900 dark:text-slate-50"
        placeholder="0.00"
        placeholderTextColor={colors.iconMuted}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.billing.method}</Text>
      <View className="flex-row flex-wrap mb-3">
        {METHODS.map((m) => (
          <TouchableOpacity
            key={m}
            className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${method === m ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`}
            onPress={() => setMethod(m)}
          >
            <Text className={`text-xs font-medium capitalize ${method === m ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>
              {m.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.status}</Text>
      <View className="flex-row mb-3">
        {(["paid", "pending", "overdue", "cancelled"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            className={`mr-2 px-3 py-1.5 rounded-full ${status === s ? "bg-brand-600" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700"}`}
            onPress={() => setStatus(s)}
          >
            <Text className={`text-xs font-medium capitalize ${status === s ? "text-white" : "text-gray-600 dark:text-slate-300"}`}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.description}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-3 text-base text-gray-900 dark:text-slate-50"
        placeholder="Payment description..."
        placeholderTextColor={colors.iconMuted}
        value={description}
        onChangeText={setDescription}
      />

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Due Date</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.iconMuted}
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">Period</Text>
          <BottomSheetTextInput
            className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 text-base text-gray-900 dark:text-slate-50"
            placeholder="e.g. April 2026"
            placeholderTextColor={colors.iconMuted}
            value={period}
            onChangeText={setPeriod}
          />
        </View>
      </View>

      <Text className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-1">{t.common.notes}</Text>
      <BottomSheetTextInput
        className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-3 mb-4 text-base text-gray-900 dark:text-slate-50"
        placeholder="Internal notes..."
        placeholderTextColor={colors.iconMuted}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={2}
        style={{ minHeight: 48, textAlignVertical: "top" }}
      />
    </AppBottomSheet>
  );
}
