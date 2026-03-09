import { View, Text, TouchableOpacity } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  return (
    <View className="items-center justify-center py-16 px-8">
      <AlertTriangle size={40} color="#ef4444" />
      <Text className="text-base font-semibold text-gray-900 mt-3">
        Failed to load
      </Text>
      <Text className="text-sm text-gray-500 text-center mt-1">
        {message || "Please check your connection and try again."}
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="mt-4 bg-brand-600 rounded-xl px-5 py-2.5 flex-row items-center"
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color="#fff" />
          <Text className="text-white font-medium text-sm ml-1.5">Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
