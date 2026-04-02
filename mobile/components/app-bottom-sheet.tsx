import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Keyboard, Platform } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput as _BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const scrollRef = useRef<any>(null);
  const contentRef = useRef<View>(null);
  const isPresented = useRef(false);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  // Track keyboard height for extra scroll padding + auto-scroll to focused input
  useEffect(() => {
    if (!visible) return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);

      // Auto-scroll to focused input after keyboard animates
      setTimeout(() => {
        const focused = TextInput.State.currentlyFocusedInput();
        if (!focused || !contentRef.current) return;

        focused.measureLayout(
          contentRef.current as any,
          (_x: number, y: number, _w: number, h: number) => {
            scrollRef.current?.scrollTo({
              y: Math.max(0, y - 80),
              animated: true,
            });
          },
          () => {}
        );
      }, 250);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
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
    setKeyboardHeight(0);
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
            <Text className="text-lg font-semibold text-gray-900">{title} (v1)</Text>
          </View>
        ) : null}
      </View>
    ),
    [title]
  );

  const footerSpace = footer ? 60 : 16;

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
      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: footerSpace + keyboardHeight,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View ref={contentRef}>
          {children}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
