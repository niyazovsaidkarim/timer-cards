package uz.saidkarim.focus;
import android.app.*;import android.os.*;import android.content.*;import android.webkit.*;import android.view.*;
public class MainActivity extends Activity {
 WebView web;
 public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(0xfff6f4ee);getWindow().setNavigationBarColor(0xfff6f4ee);getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);web=new WebView(this);setContentView(web);web.setOnApplyWindowInsetsListener((v,i)->{v.setPadding(i.getSystemWindowInsetLeft(),i.getSystemWindowInsetTop(),i.getSystemWindowInsetRight(),i.getSystemWindowInsetBottom());return i;});web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);web.getSettings().setAllowFileAccess(false);web.addJavascriptInterface(new Bridge(),"Native");web.setWebChromeClient(new WebChromeClient());web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}});web.loadUrl("file:///android_asset/index.html");if(Build.VERSION.SDK_INT>=33)requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},1);}
 public class Bridge {
 @JavascriptInterface public String load(){return getPreferences(0).getString("state","");}
 @JavascriptInterface public void save(String value){getPreferences(0).edit().putString("state",value).commit();try{TimerReceiver.sync(MainActivity.this,new org.json.JSONObject(value));}catch(org.json.JSONException ignored){}}
 @JavascriptInterface public void fullscreen(boolean yes){runOnUiThread(()->{setRequestedOrientation(yes
     ? android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
     : android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
   getWindow().getDecorView().setSystemUiVisibility(yes?5894:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);if(yes)getWindow().addFlags(128);else getWindow().clearFlags(128);});}
 @JavascriptInterface public void settings(){runOnUiThread(()->startActivity(new Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)));}
 @JavascriptInterface public boolean allowed(){return TimerReceiver.notifications(MainActivity.this).isNotificationPolicyAccessGranted();}
 @JavascriptInterface public String external(){if(!getPreferences(0).getBoolean("externalPause",false))return "";
 getPreferences(0).edit().remove("externalPause").commit();return load();}
 @JavascriptInterface public void done(long deadline,String cue){runOnUiThread(()->TimerReceiver.signal(MainActivity.this,deadline,cue));}

 }
 @Override public void onBackPressed(){web.evaluateJavascript("back()", value->{if("false".equals(value))finish();});}
}
