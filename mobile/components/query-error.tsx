import { View, Text, TouchableOpacity } from "react-native";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useT } from "@/lib/i18n";

interface QueryErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function QueryError({ message, onRetry }: QueryErrorProps) {
  const colors = useThemeColors();
  const t = useT();

  return (
    <View className="items-center justify-center py-16 px-8">
      <AlertTriangle size={40} color={colors.destructive} />
      <Text className="text-base font-semibold text-gray-900 dark:text-slate-50 mt-3">
        {t.errors.failedToLoad}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-slate-400 text-center mt-1">
        {message || t.errors.checkConnection}
      </Text>
      {onRetry && (
        <TouchableOpacity
          className="mt-4 bg-brand-600 rounded-xl px-5 py-2.5 flex-row items-center"
          onPress={onRetry}
          activeOpacity={0.7}
        >
          <RefreshCw size={16} color="#fff" />
          <Text className="text-white font-medium text-sm ml-1.5">{t.common.retry}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
