# Smooth Motion

AURORA uses native-driver Reanimated animations and 120 Hz-friendly frame pacing. On supported iPhone and Android devices, the system may refresh at up to 120 Hz; animation timing adapts to the display rather than enforcing a fixed 60 Hz loop.

## Implementation guidance

- Use `react-native-reanimated` for transforms and opacity; avoid changing layout or recreating inline animated styles every frame.
- Use the native driver in legacy Animated APIs.
- Keep lists virtualized; use `removeClippedSubviews`, stable keys, and memoized row components.
- Enable iOS high refresh by adding `CADisableMinimumFrameDurationOnPhone` in `Info.plist` or configuring it in the Expo iOS build settings. Native Expo modules and Reanimated provide the runtime support.
- Android 120 Hz support depends on the manufacturer, system display settings, app `VSYNC` scheduling, and an SDK/config that permits high refresh. Do not force 120 Hz from JavaScript.
- When testing, use a real 120 Hz device and profile dropped frames; JavaScript cannot guarantee 120 FPS.
