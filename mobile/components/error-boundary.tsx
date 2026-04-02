import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AlertTriangle, RefreshCw } from "lucide-react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-gray-50 dark:bg-slate-950 items-center justify-center px-8">
          <AlertTriangle size={48} color="#ef4444" />
          <Text className="text-xl font-bold text-gray-900 dark:text-slate-50 mt-4">
            Something went wrong
          </Text>
          <Text className="text-sm text-gray-500 dark:text-slate-400 text-center mt-2">
            {this.state.error?.message || "An unexpected error occurred"}
          </Text>
          <TouchableOpacity
            className="mt-6 bg-brand-600 rounded-xl px-6 py-3 flex-row items-center"
            onPress={this.handleRetry}
            activeOpacity={0.7}
          >
            <RefreshCw size={18} color="#fff" />
            <Text className="text-white font-semibold ml-2">Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
