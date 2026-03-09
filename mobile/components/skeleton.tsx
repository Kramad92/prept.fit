import { View } from "react-native";

export function SkeletonCard({ height = 72 }: { height?: number }) {
  return (
    <View
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
      style={{ height }}
    >
      <View className="h-4 w-24 bg-gray-200 rounded mb-3" />
      <View className="h-5 w-48 bg-gray-100 rounded" />
    </View>
  );
}

export function SkeletonLine({
  width = "100%",
  height = 16,
}: {
  width?: number | `${number}%`;
  height?: number;
}) {
  return (
    <View
      className="bg-gray-200 rounded"
      style={{ width: width as number, height, marginBottom: 8 }}
    />
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View className="px-4 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
