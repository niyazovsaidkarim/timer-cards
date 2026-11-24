#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
: "${JAVA_HOME:?Set JAVA_HOME to JDK 17 or newer}"
BT="$ANDROID_HOME/build-tools/35.0.0"
JAR="$ANDROID_HOME/platforms/android-35/android.jar"
OUT="$PWD/app/build/manual"
mkdir -p "$OUT/classes" "$OUT/dex"
python3 - "$OUT/AndroidManifest.xml" <<'PY'
import sys
s=open('app/src/main/AndroidManifest.xml').read().replace('<manifest ', '<manifest package="uz.saidkarim.focus" android:versionCode="6" android:versionName="1.5" ',1).replace('<application ', '<uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/><application ',1)
open(sys.argv[1],'w').write(s)
PY
"$BT/aapt2" compile --dir app/src/main/res -o "$OUT/resources.zip"
"$BT/aapt2" link -I "$JAR" --manifest "$OUT/AndroidManifest.xml" -A app/src/main/assets -o "$OUT/unsigned.apk" "$OUT/resources.zip"
"$JAVA_HOME/bin/javac" -source 8 -target 8 -bootclasspath "$JAR:$BT/core-lambda-stubs.jar" -d "$OUT/classes" app/src/main/java/uz/saidkarim/focus/*.java
"$JAVA_HOME/bin/java" -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --lib "$JAR" --min-api 26 --output "$OUT/dex" "$OUT"/classes/uz/saidkarim/focus/*.class
(cd "$OUT/dex" && zip -q -u "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
# Development signing only. Preserve this private local key for personal updates.
if [ ! -f debug.keystore ]; then
 "$JAVA_HOME/bin/keytool" -genkeypair -keystore debug.keystore -storepass android -keypass android -alias androiddebugkey -dname 'CN=Android Debug,O=Android,C=US' -keyalg RSA -validity 10000
fi
JAVA_HOME="$JAVA_HOME" "$BT/apksigner" sign --ks debug.keystore --ks-pass pass:android --key-pass pass:android --out "$OUT/Sokin-Focus-1.5.apk" "$OUT/aligned.apk"
JAVA_HOME="$JAVA_HOME" "$BT/apksigner" verify --verbose "$OUT/Sokin-Focus-1.5.apk"
echo "$OUT/Sokin-Focus-1.5.apk"
