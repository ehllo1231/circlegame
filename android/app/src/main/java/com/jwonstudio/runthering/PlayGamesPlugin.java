package com.jwonstudio.runthering;

import android.app.Activity;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.PluginMethod;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.LeaderboardsClient;
import com.google.android.gms.common.api.ApiException;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
  private static final String TAG = "PlayGamesPlugin";
  private static final String LEADERBOARD_RESULT_CALLBACK = "handleLeaderboardResult";
  private boolean sdkInitialized = false;

  private boolean ensureSdkInitialized(Activity activity, JSObject payload) {
    if (activity == null) {
      Log.w(TAG, "Play Games SDK init failed: no activity");
      if (payload != null) {
        payload.put("error", "No activity available");
      }
      return false;
    }
    if (sdkInitialized) {
      return true;
    }
    try {
      Log.d(TAG, "Initializing Play Games SDK");
      PlayGamesSdk.initialize(activity);
      sdkInitialized = true;
      Log.d(TAG, "Play Games SDK initialized");
      return true;
    } catch (Exception error) {
      logApiException("Play Games SDK init failed", error);
      populateErrorPayload(payload, error);
      return false;
    }
  }

  @PluginMethod
  public void signIn(PluginCall call) {
    JSObject basePayload = new JSObject();
    basePayload.put("authenticated", false);
    getBridge().executeOnMainThread(() -> {
      Activity activity = getActivity();
      if (!ensureSdkInitialized(activity, basePayload)) {
        call.resolve(basePayload);
        return;
      }
      Log.d(TAG, "signIn requested");
      GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);
      signInClient.isAuthenticated()
        .addOnSuccessListener(result -> {
          if (result != null && result.isAuthenticated()) {
            Log.d(TAG, "signIn already authenticated");
            JSObject payload = new JSObject();
            payload.put("authenticated", true);
            call.resolve(payload);
            return;
          }
          Log.d(TAG, "signIn not authenticated, requesting sign-in");
          signInClient.signIn()
            .addOnSuccessListener(authResult -> {
              boolean authenticated = authResult != null && authResult.isAuthenticated();
              JSObject payload = new JSObject();
              payload.put("authenticated", authenticated);
              if (!authenticated) {
                Log.w(TAG, "signIn returned not authenticated");
                payload.put("error", "not-authenticated");
              }
              call.resolve(payload);
            })
            .addOnFailureListener(error -> {
              logApiException("signIn failed", error);
              JSObject payload = new JSObject();
              payload.put("authenticated", false);
              populateErrorPayload(payload, error);
              call.resolve(payload);
            });
        })
        .addOnFailureListener(error -> {
          logApiException("isAuthenticated failed", error);
          JSObject payload = new JSObject();
          payload.put("authenticated", false);
          populateErrorPayload(payload, error);
          call.resolve(payload);
        });
    });
  }

  @PluginMethod
  public void submitScore(PluginCall call) {
    String leaderboardId = call.getString("leaderboardId");
    Integer score = call.getInt("score");
    JSObject basePayload = new JSObject();
    basePayload.put("submitted", false);
    if (leaderboardId == null || leaderboardId.isEmpty() || score == null) {
      Log.w(TAG, "submitScore missing leaderboardId or score");
      basePayload.put("error", "Missing leaderboardId or score");
      call.resolve(basePayload);
      return;
    }
    getBridge().executeOnMainThread(() -> {
      Activity activity = getActivity();
      if (!ensureSdkInitialized(activity, basePayload)) {
        call.resolve(basePayload);
        return;
      }
      Log.d(TAG, "submitScore leaderboardId=" + leaderboardId + " score=" + score);
      LeaderboardsClient leaderboards = PlayGames.getLeaderboardsClient(activity);
      leaderboards.submitScoreImmediate(leaderboardId, score.longValue())
        .addOnSuccessListener(result -> {
          JSObject payload = new JSObject();
          payload.put("submitted", true);
          call.resolve(payload);
        })
        .addOnFailureListener(error -> {
          logApiException("submitScore failed", error);
          JSObject payload = new JSObject();
          payload.put("submitted", false);
          populateErrorPayload(payload, error);
          call.resolve(payload);
        });
    });
  }

  @PluginMethod
  public void showLeaderboard(PluginCall call) {
    String leaderboardId = call.getString("leaderboardId");
    JSObject basePayload = new JSObject();
    basePayload.put("opened", false);
    if (leaderboardId == null || leaderboardId.isEmpty()) {
      Log.w(TAG, "showLeaderboard missing leaderboardId");
      basePayload.put("error", "Missing leaderboardId");
      call.resolve(basePayload);
      return;
    }
    getBridge().executeOnMainThread(() -> {
      Activity activity = getActivity();
      if (!ensureSdkInitialized(activity, basePayload)) {
        call.resolve(basePayload);
        return;
      }
      Log.d(TAG, "showLeaderboard leaderboardId=" + leaderboardId);
      LeaderboardsClient leaderboards = PlayGames.getLeaderboardsClient(activity);
      leaderboards.getLeaderboardIntent(leaderboardId)
        .addOnSuccessListener(intent -> {
          getBridge().executeOnMainThread(() -> {
            Log.d(TAG, "showLeaderboard launching intent");
            startActivityForResult(call, intent, LEADERBOARD_RESULT_CALLBACK);
          });
        })
        .addOnFailureListener(error -> {
          logApiException("showLeaderboard failed", error);
          JSObject payload = new JSObject();
          payload.put("opened", false);
          populateErrorPayload(payload, error);
          call.resolve(payload);
        });
    });
  }

  private void logApiException(String message, Exception error) {
    if (error instanceof ApiException) {
      ApiException apiError = (ApiException) error;
      Log.w(TAG, message + " (statusCode=" + apiError.getStatusCode() + ")", error);
      return;
    }
    Log.w(TAG, message, error);
  }

  private void populateErrorPayload(JSObject payload, Exception error) {
    if (payload == null || error == null) return;
    String message = error.getMessage();
    if (message == null || message.trim().isEmpty()) {
      message = error.getClass().getSimpleName();
    }
    payload.put("error", message);
    if (error instanceof ApiException) {
      ApiException apiError = (ApiException) error;
      payload.put("statusCode", apiError.getStatusCode());
    }
  }

  @ActivityCallback
  private void handleLeaderboardResult(PluginCall call, ActivityResult result) {
    if (call == null) {
      Log.w(TAG, "showLeaderboard result received with no call");
      return;
    }
    JSObject payload = new JSObject();
    payload.put("opened", true);
    call.resolve(payload);
  }
}
