import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Keyboard, Platform } from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput as _BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/hooks/use-theme-colors";

// Re-export so consumers don't need a separate import
export const BottomSheetTextInput = _BottomSheetTextInput;

interface Props {
  visible: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Fixed content rendered above the scrollable area */
  stickyHeader?: React.ReactNode;
}

export function AppBottomSheet({
  visible,
  onClose,
  snapPoints,
  title,
  children,
  footer,
  stickyHeader,
}: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<any>(null);
  const contentRef = useRef<View>(null);
  const isPresented = useRef(false);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const colors = useThemeColors();

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

  const scrollToFocused = useCallback(() => {
    setTimeout(() => {
      const focused = TextInput.State.currentlyFocusedInput();
      if (!focused || !contentRef.current) return;

      focused.measureLayout(
        contentRef.current as any,
        (_x: number, y: number, _w: number, _h: number) => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, y - 80),
            animated: true,
          });
        },
        () => {}
      );
    }, 150);
  }, []);

  // Track keyboard height for extra scroll padding + auto-scroll on keyboard open
  useEffect(() => {
    if (!visible) return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      scrollToFocused();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible, scrollToFocused]);

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
          className="px-5 pt-3 pb-2 border-t border-gray-100 dark:border-slate-700/40 bg-white dark:bg-slate-800"
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
              backgroundColor: colors.inputBorder,
            }}
          />
        </View>
        {title ? (
          <View className="px-5 pt-1 pb-3 border-b border-gray-100 dark:border-slate-700/40">
            <Text className="text-lg font-semibold text-gray-900 dark:text-slate-50">{title}</Text>
          </View>
        ) : null}
      </View>
    ),
    [title, colors.inputBorder]
  );

  const footerSpace = footer ? 60 : 16;

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      enablePanDownToClose
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      handleComponent={renderHandle}
      backgroundStyle={{
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        backgroundColor: colors.card,
      }}
      footerComponent={footer ? renderFooter : undefined}
      enableOverDrag={false}
      snapPoints={snapPoints || ["60%"]}
      enableDynamicSizing={false}
    >
      {stickyHeader && (
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {stickyHeader}
        </View>
      )}
      <BottomSheetScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: stickyHeader ? 8 : 16,
          paddingBottom: footerSpace + keyboardHeight,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          ref={contentRef}
          onTouchEnd={scrollToFocused}
        >
          {children}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
