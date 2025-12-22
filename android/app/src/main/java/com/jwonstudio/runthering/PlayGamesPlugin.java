package com.jwonstudio.runthering;

import android.app.Activity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.LeaderboardsClient;

@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {
  private boolean sdkInitialized = false;

  private boolean ensureSdkInitialized(PluginCall call) {
    if (sdkInitialized) {
      return true;
    }
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("No activity available");
      return false;
    }
    try {
      PlayGamesSdk.initialize(activity);
      sdkInitialized = true;
      return true;
    } catch (Exception error) {
      call.reject("Play Games SDK init failed: " + error.getMessage());
      return false;
    }
  }

  @PluginMethod
  public void signIn(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("No activity available");
      return;
    }
    if (!ensureSdkInitialized(call)) {
      return;
    }
    GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);
    signInClient.isAuthenticated()
      .addOnSuccessListener(result -> {
        if (result != null && result.isAuthenticated()) {
          JSObject payload = new JSObject();
          payload.put("authenticated", true);
          call.resolve(payload);
          return;
        }
        signInClient.signIn()
          .addOnSuccessListener(authResult -> {
            JSObject payload = new JSObject();
            payload.put("authenticated", authResult != null && authResult.isAuthenticated());
            call.resolve(payload);
          })
          .addOnFailureListener(error -> {
            JSObject payload = new JSObject();
            payload.put("authenticated", false);
            payload.put("error", error.getMessage());
            call.resolve(payload);
          });
      })
      .addOnFailureListener(error -> {
        JSObject payload = new JSObject();
        payload.put("authenticated", false);
        payload.put("error", error.getMessage());
        call.resolve(payload);
      });
  }

  @PluginMethod
  public void submitScore(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("No activity available");
      return;
    }
    if (!ensureSdkInitialized(call)) {
      return;
    }
    String leaderboardId = call.getString("leaderboardId");
    Integer score = call.getInt("score");
    if (leaderboardId == null || leaderboardId.isEmpty() || score == null) {
      call.reject("Missing leaderboardId or score");
      return;
    }
    LeaderboardsClient leaderboards = PlayGames.getLeaderboardsClient(activity);
    leaderboards.submitScore(leaderboardId, score.longValue());
    JSObject payload = new JSObject();
    payload.put("submitted", true);
    call.resolve(payload);
  }

  @PluginMethod
  public void showLeaderboard(PluginCall call) {
    Activity activity = getActivity();
    if (activity == null) {
      call.reject("No activity available");
      return;
    }
    if (!ensureSdkInitialized(call)) {
      return;
    }
    String leaderboardId = call.getString("leaderboardId");
    if (leaderboardId == null || leaderboardId.isEmpty()) {
      call.reject("Missing leaderboardId");
      return;
    }
    LeaderboardsClient leaderboards = PlayGames.getLeaderboardsClient(activity);
    leaderboards.getLeaderboardIntent(leaderboardId)
      .addOnSuccessListener(intent -> {
        activity.startActivity(intent);
        call.resolve();
      })
      .addOnFailureListener(error -> call.reject(error.getMessage()));
  }
}
