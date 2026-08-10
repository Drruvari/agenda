package com.drruvari.agendawidget

import android.content.Context
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AgendaWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AgendaWidget")

    AsyncFunction("publish") { snapshot: String, generation: String ->
      val reactContext = appContext.reactContext ?: return@AsyncFunction false
      val context = reactContext.applicationContext
      val preferences = context.getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE)
      val current = preferences.getLong(KEY_GENERATION, -1)
      val next = generation.toLongOrNull() ?: return@AsyncFunction false
      if (next <= current) return@AsyncFunction false

      val previous = preferences.getString(KEY_SNAPSHOT, null)
      val committed =
        preferences
          .edit()
          .putString(KEY_LAST_GOOD, previous)
          .putString(KEY_SNAPSHOT, snapshot)
          .putLong(KEY_GENERATION, next)
          .commit()

      if (committed) {
        runCatching { AgendaWidgetReceiver.refreshAll(context) }
          .onFailure { Log.e(TAG, "refreshAll failed", it) }
      }
      committed
    }

    AsyncFunction("drainPendingToggles") {
      val reactContext = appContext.reactContext ?: return@AsyncFunction "[]"
      val context = reactContext.applicationContext
      val preferences = context.getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE)
      val pending = preferences.getString(KEY_PENDING, "[]") ?: "[]"
      preferences.edit().putString(KEY_PENDING, "[]").commit()
      pending
    }
  }

  companion object {
    private const val TAG = "AgendaWidgetModule"
    const val STORE_NAME = "agenda_widget"
    const val KEY_SNAPSHOT = "snapshot"
    const val KEY_LAST_GOOD = "snapshot_last_good"
    const val KEY_GENERATION = "generation"
    const val KEY_PENDING = "pending_toggles"
  }
}
