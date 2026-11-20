# Sokin Focus

A small offline Android focus timer for personal study. Android 8.0+ (API 26). No account, analytics, advertisements, network permission, remote fonts or external assets.

## Features

- 25/45/60 minute presets and custom 1–180 minute timer.
- Optional task name, pause/resume, early finish with actual elapsed time saved.
- Separate break mode; breaks and pauses never contribute to study totals.
- Black immersive fullscreen with large digits, landscape support and screen kept awake.
- Daily / weekly charts, previous period navigation, editable daily goal (default five hours).
- Session history and automatic local persistence. Active timer is restored after app/process closure.
- Android completion notification (permission requested on Android 13+).

## Accounting

Only active focus intervals count. A timer is a record of self-reported study, not proof of attention; it does not block other apps. Running intervals stop at the planned deadline, including when the app is reopened late. Pauses are excluded, and intervals crossing local midnight are split between dates. Charts include the current running focus; session count and longest session refer to saved sessions. History groups sessions by start date. Dates use the device's current local time zone.

The app uses persisted wall-clock deadlines. Manually changing the clock/time zone can affect accounting. Background notifications use Android inexact alarms and can be delayed by battery restrictions. Reboot cancels the OS alarm, but opening the app restores and reconciles the timer. Force-stop suppresses Android alarms until reopened. Fullscreen is not an app blocker. Local history is removed by clearing app storage or uninstalling; there is no cloud backup.

## Build

Install JDK 17+, Android SDK platform 35 and build-tools 35.0.0. No third-party app dependencies.

```sh
export JAVA_HOME=/path/to/jdk
export ANDROID_HOME=/path/to/android-sdk
bash scripts/build-apk.sh
```

Output: `app/build/manual/Sokin-Focus-1.0.apk`. The script uses the official Android SDK tools directly, so it does not need Maven/Gradle dependency downloads. The Gradle project can also be opened in Android Studio.

`debug.keystore` is generated locally and must remain private. Preserve it to sign future updates with the same identity; otherwise Android requires uninstalling the old app, which removes its local data. This personal APK uses development signing. A store release needs a production signing setup. The CI artifact gets an ephemeral development key and is not an in-place update for the delivered APK.

## Validation

```sh
node tests/engine.test.cjs
node tests/app.test.cjs
```

Tests cover deadline capping, pause/resume, repeated completion, state persistence, early finish, midnight split, custom input validation, weekly chart construction, and break exclusion. Controller tests use a lightweight DOM fixture; these are not emulator/real-device UI tests. The APK is compiled, aligned, and verified with `apksigner`. Device installation, OEM background behavior and visual layout still require a real Android smoke test. Gradle lint was not run successfully in the initial restricted build environment.

## Device smoke test

Install the APK, grant notifications, set a one-minute timer, enter fullscreen and rotate. Pause for a few seconds, resume, then let it finish. Check history and totals. Repeat with the screen locked and with the app swiped away. Test break mode and confirm it does not increase study totals. Turn on airplane mode to verify all app features remain available.
