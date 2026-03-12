import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  X,
} from "lucide-react-native";
import { useCoachPayments, useCoachClients } from "@/hooks/use-coach-data";
import { api } from "@/lib/api-client";
import { haptics } from "@/lib/haptics";
import { QueryError } from "@/components/query-error";

type StatusFilter = "all" | "pending" | "overdue" | "paid";

const METHODS = ["cash", "bank_transfer", "card", "venmo", "zelle", "other"];

export default function CoachPaymentsScreen() {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const statusParam = filter === "all" ? undefined : filter;
  const { data, isLoading, error, refetch, isRefetching } =
    useCoachPayments(statusParam);

  const renderPayment = useCallback(
    ({ item }: { item: any }) => {
      const s = item.status?.toLowerCase();
      return (
        <TouchableOpacity
          className="flex-row items-center px-4 py-3.5 bg-white border-b border-gray-50"
          onPress={() =>
            router.push(
              `/(coach)/clients/${item.clientId || item.client?.id}` as never
            )
          }
          activeOpacity={0.6}
        >
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
              s === "overdue"
                ? "bg-red-50"
                : s === "pending"
                ? "bg-amber-50"
                : "bg-green-50"
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
            <Text className="text-sm font-medium text-gray-900">
              {item.client?.name || "Client"}
            </Text>
            <Text className="text-xs text-gray-500">
              {item.description || "Payment"}
              {item.dueDate &&
                ` · Due ${new Date(item.dueDate).toLocaleDateString()}`}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-gray-900">
              {item.amount?.toFixed(2)} {item.currency || ""}
            </Text>
            <View
              className={`px-1.5 py-0.5 rounded-full mt-0.5 ${
                s === "overdue"
                  ? "bg-red-50"
                  : s === "pending"
                  ? "bg-amber-50"
                  : "bg-green-50"
              }`}
            >
              <Text
                className={`text-[10px] font-medium capitalize ${
                  s === "overdue"
                    ? "text-red-700"
                    : s === "pending"
                    ? "text-amber-700"
                    : "text-green-700"
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
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header onAdd={() => setShowAdd(true)} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <Header onAdd={() => setShowAdd(true)} />
        <QueryError message="Failed to load payments" onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const summary = data?.summary;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <Header onAdd={() => setShowAdd(true)} />

      {summary && (
        <View className="flex-row px-4 pb-3">
          <SummaryCard
            label="Collected"
            value={summary.totalCollected}
            color="text-green-700"
            bg="bg-green-50"
          />
          <SummaryCard
            label="Pending"
            value={summary.totalPending}
            color="text-amber-700"
            bg="bg-amber-50"
          />
          <SummaryCard
            label="Overdue"
            value={summary.totalOverdue}
            color="text-red-700"
            bg="bg-red-50"
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
                  : "bg-white border border-gray-200"
              }`}
              onPress={() => setFilter(f)}
              activeOpacity={0.6}
            >
              <Text
                className={`text-xs font-medium capitalize ${
                  filter === f ? "text-white" : "text-gray-600"
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
            tintColor="#059669"
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <CreditCard size={40} color="#d1d5db" />
            <Text className="text-gray-400 text-sm mt-3">No payments</Text>
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
    </SafeAreaView>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
      <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
        <ArrowLeft size={22} color="#111827" />
      </TouchableOpacity>
      <Text className="text-lg font-semibold text-gray-900 flex-1">
        Payments
      </Text>
      <TouchableOpacity
        onPress={onAdd}
        className="bg-brand-600 rounded-lg px-3 py-1.5 flex-row items-center"
        activeOpacity={0.7}
      >
        <Plus size={14} color="#fff" />
        <Text className="text-white text-xs font-semibold ml-1">Record</Text>
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
      <Text className="text-[10px] text-gray-500 font-medium">{label}</Text>
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
  const queryClient = useQueryClient();
  const { data: clients } = useCoachClients();
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [status, setStatus] = useState<"paid" | "pending">("paid");
  const [description, setDescription] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(false);

  const selectedClient = clients?.find((c) => c.id === clientId);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/api/payments", data),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["coach-payments"] });
      queryClient.invalidateQueries({ queryKey: ["coach-dashboard"] });
      // Reset form
      setClientId("");
      setAmount("");
      setMethod("cash");
      setStatus("paid");
      setDescription("");
      onSuccess();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to record payment");
    },
  });

  const handleSubmit = () => {
    if (!clientId) {
      Alert.alert("Required", "Please select a client");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Required", "Please enter a valid amount");
      return;
    }
    createMutation.mutate({
      clientId,
      amount: parsedAmount,
      method,
      status,
      description: description.trim() || null,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView className="flex-1 bg-gray-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
            <TouchableOpacity onPress={onClose} className="mr-3 p-1">
              <X size={22} color="#111827" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900 flex-1">
              Record Payment
            </Text>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
          >
            {/* Client Selector */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Client
            </Text>
            <TouchableOpacity
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4"
              onPress={() => setShowClientPicker(!showClientPicker)}
              activeOpacity={0.6}
            >
              <Text
                className={
                  selectedClient ? "text-gray-900" : "text-gray-400"
                }
              >
                {selectedClient?.name || "Select client..."}
              </Text>
            </TouchableOpacity>

            {showClientPicker && (
              <View className="bg-white border border-gray-200 rounded-lg mb-4 max-h-48 overflow-hidden">
                <ScrollView nestedScrollEnabled>
                  {(clients || []).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      className={`px-4 py-2.5 border-b border-gray-50 ${
                        c.id === clientId ? "bg-brand-50" : ""
                      }`}
                      onPress={() => {
                        setClientId(c.id);
                        setShowClientPicker(false);
                      }}
                    >
                      <Text className="text-sm text-gray-900">{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Amount */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Amount
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-4 text-base text-gray-900"
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Method */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Method
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {METHODS.map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`mr-2 mb-2 px-3 py-1.5 rounded-full ${
                    method === m
                      ? "bg-brand-600"
                      : "bg-white border border-gray-200"
                  }`}
                  onPress={() => setMethod(m)}
                >
                  <Text
                    className={`text-xs font-medium capitalize ${
                      method === m ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {m.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Status */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Status
            </Text>
            <View className="flex-row mb-4">
              {(["paid", "pending"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  className={`mr-2 px-4 py-2 rounded-lg ${
                    status === s
                      ? "bg-brand-600"
                      : "bg-white border border-gray-200"
                  }`}
                  onPress={() => setStatus(s)}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      status === s ? "text-white" : "text-gray-600"
                    }`}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text className="text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 mb-6 text-base text-gray-900"
              placeholder="Monthly coaching fee..."
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={setDescription}
            />

            {/* Submit */}
            <TouchableOpacity
              className={`rounded-lg py-3.5 items-center mb-8 ${
                createMutation.isPending ? "bg-brand-400" : "bg-brand-600"
              }`}
              onPress={handleSubmit}
              disabled={createMutation.isPending}
              activeOpacity={0.8}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  Record Payment
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
