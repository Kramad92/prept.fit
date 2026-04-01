import { useCallback, useEffect, useRef } from "react";
import { View, Text, Dimensions } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface Props {
  visible: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
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

  const renderFooter = useCallback(
    () =>
      footer ? (
        <View
          className="px-5 pt-3 pb-2 border-t border-gray-100 bg-white"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {footer}
        </View>
      ) : null,
    [footer, insets.bottom]
  );

  const renderHandle = useCallback(
    () => (
      <View>
        <View className="items-center pt-2 pb-1">
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#d1d5db" }} />
        </View>
        {title ? (
          <View className="px-5 pt-1 pb-3 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          </View>
        ) : null}
      </View>
    ),
    [title]
  );

  const modalProps: any = {
    ref,
    backdropComponent: renderBackdrop,
    onDismiss: handleDismiss,
    enablePanDownToClose: true,
    keyboardBehavior: "extend",
    keyboardBlurBehavior: "restore",
    android_keyboardInputMode: "adjustResize",
    handleComponent: renderHandle,
    backgroundStyle: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    footerComponent: footer ? renderFooter : undefined,
  };

  if (!snapPoints) {
    modalProps.enableDynamicSizing = true;
    modalProps.maxDynamicContentSize = SCREEN_HEIGHT * maxHeightRatio;
  } else {
    modalProps.snapPoints = snapPoints;
    modalProps.enableDynamicSizing = false;
  }

  return (
    <BottomSheetModal {...modalProps}>
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: footer ? 80 : 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
