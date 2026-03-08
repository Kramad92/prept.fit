import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import {
  MessageCircle,
  ClipboardList,
  TrendingUp,
  Calendar,
  Users,
  CreditCard,
  LogOut,
  ChevronRight,
} from "lucide-react-native";

const menuItems = [
  { icon: MessageCircle, label: "Messages", href: "/(client)/messages" },
  { icon: ClipboardList, label: "Check-ins", href: "/(client)/check-ins" },
  { icon: TrendingUp, label: "Progress", href: "/(client)/progress" },
  { icon: Calendar, label: "Book Session", href: "/(client)/book" },
  { icon: Users, label: "Group Training", href: "/(client)/group-training" },
  { icon: CreditCard, label: "Payments", href: "/(client)/payments" },
];

export default function MoreScreen() {
  const { logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">More</Text>

        <View className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-4 py-3.5 ${
                index < menuItems.length - 1 ? "border-b border-gray-100" : ""
              }`}
              activeOpacity={0.6}
            >
              <item.icon size={20} color="#6b7280" />
              <Text className="flex-1 ml-3 text-base text-gray-900">
                {item.label}
              </Text>
              <ChevronRight size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          className="flex-row items-center bg-white rounded-xl border border-gray-100 px-4 py-3.5"
          onPress={logout}
          activeOpacity={0.6}
        >
          <LogOut size={20} color="#ef4444" />
          <Text className="ml-3 text-base text-red-600 font-medium">
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
