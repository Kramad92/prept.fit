import { useCallback, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fixed snap points. When omitted, sheet sizes to content dynamically. */
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  /** Sticky footer rendered below scrollable content (e.g. action button). */
  footer?: React.ReactNode;
  /** Max height as fraction of screen (0-1). Default 0.85. Only used with dynamic sizing. */
  maxHeightRatio?: number;
}

export function AppBottomSheet({
  visible,
  onClose,
  snapPoints,
  title,
  children,
  footer,
  maxHeightRatio = 0.85,
}: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const isPresented = useRef(false);
  const insets = useSafeAreaInsets();
  const useDynamic = !snapPoints;

  useEffect(() => {
    if (visible && !isPresented.current) {
      const timer = setTimeout(() => {
        ref.current?.present();
        isPresented.current = true;
      }, 50);
      return () => clearTimeout(timer);
    } else if (!visible && isPresented.current) {
      ref.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    onClose();
  }, [onClose]);

  const header = title ? (
    <View className="flex-row items-center px-5 pt-1 pb-3 border-b border-gray-100">
      <Text className="text-lg font-semibold text-gray-900 flex-1">
        {title}
      </Text>
      <TouchableOpacity onPress={onClose} className="p-1 -mr-1">
        <X size={22} color="#6b7280" />
      </TouchableOpacity>
    </View>
  ) : null;

  const stickyFooter = footer ? (
    <View
      className="px-5 pt-3 pb-2 border-t border-gray-100 bg-white"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {footer}
    </View>
  ) : null;

  const modalProps: any = {
    ref,
    backdropComponent: renderBackdrop,
    onDismiss: handleDismiss,
    enablePanDownToClose: true,
    keyboardBehavior: "extend",
    keyboardBlurBehavior: "restore",
    android_keyboardInputMode: "adjustResize",
    handleIndicatorStyle: { backgroundColor: "#d1d5db", width: 36 },
    backgroundStyle: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  };

  if (useDynamic) {
    modalProps.enableDynamicSizing = true;
    modalProps.maxDynamicContentSize = SCREEN_HEIGHT * maxHeightRatio;
  } else {
    modalProps.snapPoints = snapPoints;
    modalProps.enableDynamicSizing = false;
  }

  // For fixed snap points with footer, use BottomSheetView (flex layout)
  // For dynamic sizing, use BottomSheetView and let content determine size
  if (footer) {
    return (
      <BottomSheetModal {...modalProps}>
        <BottomSheetView style={snapPoints ? { flex: 1 } : undefined}>
          {header}
          {snapPoints ? (
            // Fixed height: scrollable content area
            <BottomSheetScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}
              keyboardShouldPersistTaps="handled"
              style={{ flex: 1 }}
            >
              {children}
            </BottomSheetScrollView>
          ) : (
            // Dynamic: content just renders, no scroll
            <View className="px-5 pt-4 pb-2">
              {children}
            </View>
          )}
          {stickyFooter}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }

  // No footer — simple content sheet
  return (
    <BottomSheetModal {...modalProps}>
      {useDynamic ? (
        <BottomSheetView>
          {header}
          <View className="px-5 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            {children}
          </View>
        </BottomSheetView>
      ) : (
        <BottomSheetScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {header}
          <View className="px-5 pt-4">
            {children}
          </View>
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
}
