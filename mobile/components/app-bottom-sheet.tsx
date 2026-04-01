import { useCallback, useEffect, useRef, memo } from "react";
import { View, Text } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput as _BottomSheetTextInput,
  createBottomSheetScrollableComponent,
  type BottomSheetScrollViewMethods,
} from "@gorhom/bottom-sheet";
import type { BottomSheetScrollViewProps } from "@gorhom/bottom-sheet/src/components/bottomSheetScrollable/types";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import Reanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// SCROLLABLE_TYPE.SCROLLVIEW = 3 (not publicly exported in v5)
const SCROLLABLE_TYPE_SCROLLVIEW = 3;

const AnimatedScrollView =
  Reanimated.createAnimatedComponent<KeyboardAwareScrollViewProps>(
    KeyboardAwareScrollView
  );

const BottomSheetKAScrollView = memo(
  createBottomSheetScrollableComponent<
    BottomSheetScrollViewMethods,
    BottomSheetScrollViewProps
  >(SCROLLABLE_TYPE_SCROLLVIEW as any, AnimatedScrollView)
);

// Re-export so consumers don't need a separate import
export const BottomSheetTextInput = _BottomSheetTextInput;

interface Props {
  visible: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppBottomSheet({
  visible,
  onClose,
  snapPoints,
  title,
  children,
  footer,
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
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#d1d5db",
            }}
          />
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

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      enablePanDownToClose
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleComponent={renderHandle}
      backgroundStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      footerComponent={footer ? renderFooter : undefined}
      enableOverDrag={false}
      snapPoints={snapPoints || ["60%"]}
      enableDynamicSizing={false}
    >
      <BottomSheetKAScrollView
        bottomOffset={footer ? 80 : 20}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: footer ? 80 : 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </BottomSheetKAScrollView>
    </BottomSheetModal>
  );
}
