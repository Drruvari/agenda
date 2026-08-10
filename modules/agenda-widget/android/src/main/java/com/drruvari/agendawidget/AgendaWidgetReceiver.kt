package com.drruvari.agendawidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.text.SpannableString
import android.text.Spanned
import android.text.style.StrikethroughSpan
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale

class AgendaWidgetReceiver : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action == ACTION_TOGGLE) {
      val itemId = intent.getStringExtra(EXTRA_ITEM_ID)
      if (!itemId.isNullOrBlank()) {
        runCatching { toggleItem(context, itemId) }
          .onFailure { Log.e(TAG, "toggle failed", it) }
      }
      return
    }
    super.onReceive(context, intent)
  }

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    appWidgetIds.forEach { id ->
      appWidgetManager.updateAppWidget(id, buildRemoteViews(context))
    }
  }

  companion object {
    private const val TAG = "AgendaWidgetReceiver"
    private const val MAX_CONTENT_SLOTS = 6
    private const val ICON_DP = 32
    private const val COLOR_TEXT = 0xFF191917.toInt()
    private const val COLOR_MUTED = 0xFF6D6D68.toInt()
    private const val COLOR_ACCENT = 0xFF655F91.toInt()
    private const val COLOR_BORDER = 0xFFD2C9BC.toInt()
    private const val COLOR_DANGER = 0xFFC0392B.toInt()

    const val ACTION_TOGGLE = "com.drruvari.agendawidget.ACTION_TOGGLE"
    const val EXTRA_ITEM_ID = "itemId"

    private data class SlotIds(
      val label: Int,
      val row: Int,
      val icon: Int,
      val time: Int,
      val text: Int,
    )

    private val SLOTS =
      listOf(
        SlotIds(
          R.id.widget_slot_0_label,
          R.id.widget_slot_0_row,
          R.id.widget_slot_0_icon,
          R.id.widget_slot_0_time,
          R.id.widget_slot_0_text,
        ),
        SlotIds(
          R.id.widget_slot_1_label,
          R.id.widget_slot_1_row,
          R.id.widget_slot_1_icon,
          R.id.widget_slot_1_time,
          R.id.widget_slot_1_text,
        ),
        SlotIds(
          R.id.widget_slot_2_label,
          R.id.widget_slot_2_row,
          R.id.widget_slot_2_icon,
          R.id.widget_slot_2_time,
          R.id.widget_slot_2_text,
        ),
        SlotIds(
          R.id.widget_slot_3_label,
          R.id.widget_slot_3_row,
          R.id.widget_slot_3_icon,
          R.id.widget_slot_3_time,
          R.id.widget_slot_3_text,
        ),
        SlotIds(
          R.id.widget_slot_4_label,
          R.id.widget_slot_4_row,
          R.id.widget_slot_4_icon,
          R.id.widget_slot_4_time,
          R.id.widget_slot_4_text,
        ),
        SlotIds(
          R.id.widget_slot_5_label,
          R.id.widget_slot_5_row,
          R.id.widget_slot_5_icon,
          R.id.widget_slot_5_time,
          R.id.widget_slot_5_text,
        ),
      )

    private sealed class DisplayItem {
      data class Section(val title: String) : DisplayItem()

      data class Row(val json: JSONObject) : DisplayItem()
    }

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, AgendaWidgetReceiver::class.java)
      val ids = manager.getAppWidgetIds(component)
      if (ids.isEmpty()) return
      val views = buildRemoteViews(context)
      ids.forEach { id -> manager.updateAppWidget(id, views) }
    }

    private fun toggleItem(context: Context, itemId: String) {
      val preferences =
        context.getSharedPreferences(AgendaWidgetModule.STORE_NAME, Context.MODE_PRIVATE)
      val raw =
        preferences.getString(AgendaWidgetModule.KEY_SNAPSHOT, null)
          ?: preferences.getString(AgendaWidgetModule.KEY_LAST_GOOD, null)
          ?: return
      val json = JSONObject(raw)
      if (json.optInt("schemaVersion") != 1) return
      val rows = json.optJSONArray("rows") ?: return
      var matched = false
      var nextCompleted = false
      for (index in 0 until rows.length()) {
        val row = rows.optJSONObject(index) ?: continue
        if (row.optString("id") != itemId) continue
        val checkable =
          if (row.has("checkable")) row.optBoolean("checkable")
          else row.optString("source") == "agenda"
        if (!checkable) return
        nextCompleted = !row.optBoolean("completed")
        row.put("completed", nextCompleted)
        if (nextCompleted) row.put("late", false)
        matched = true
        break
      }
      if (!matched) return

      var remaining = 0
      for (index in 0 until rows.length()) {
        val row = rows.optJSONObject(index) ?: continue
        if (!row.optBoolean("completed")) remaining += 1
      }
      json.put("remainingCount", remaining)
      val generation = System.currentTimeMillis()
      json.put("generation", generation)

      val pending =
        JSONArray(preferences.getString(AgendaWidgetModule.KEY_PENDING, "[]") ?: "[]")
      pending.put(
        JSONObject()
          .put("id", itemId)
          .put("completed", nextCompleted),
      )

      preferences
        .edit()
        .putString(AgendaWidgetModule.KEY_SNAPSHOT, json.toString())
        .putLong(AgendaWidgetModule.KEY_GENERATION, generation)
        .putString(AgendaWidgetModule.KEY_PENDING, pending.toString())
        .commit()

      refreshAll(context)
    }

    private fun buildRemoteViews(context: Context): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.agenda_widget)
      val snapshot =
        runCatching { loadSnapshot(context) }
          .onFailure { Log.e(TAG, "loadSnapshot failed", it) }
          .getOrNull()

      views.setTextViewText(R.id.widget_date, formatDate(snapshot?.optString("date").orEmpty()))
      views.setTextViewText(
        R.id.widget_count,
        (snapshot?.optInt("remainingCount") ?: 0).toString(),
      )

      SLOTS.forEach { slot ->
        views.setViewVisibility(slot.label, View.GONE)
        views.setViewVisibility(slot.row, View.GONE)
      }
      views.setViewVisibility(R.id.widget_empty, View.GONE)
      views.setViewVisibility(R.id.widget_more, View.GONE)

      val rows = snapshot?.optJSONArray("rows") ?: JSONArray()
      if (rows.length() == 0) {
        views.setViewVisibility(R.id.widget_empty, View.VISIBLE)
        views.setTextViewText(R.id.widget_empty, "Nothing left today")
      } else {
        val display = buildDisplayItems(rows)
        val limit = minOf(display.size, MAX_CONTENT_SLOTS)
        var shownRows = 0
        for (index in 0 until limit) {
          when (val item = display[index]) {
            is DisplayItem.Section -> {
              val slot = SLOTS[index]
              views.setViewVisibility(slot.label, View.VISIBLE)
              views.setTextViewText(slot.label, item.title)
            }
            is DisplayItem.Row -> {
              bindRow(context, views, SLOTS[index], item.json, index)
              shownRows += 1
            }
          }
        }

        val totalRows = rows.length()
        val hidden = totalRows - shownRows
        if (hidden > 0) {
          views.setViewVisibility(R.id.widget_more, View.VISIBLE)
          views.setTextViewText(R.id.widget_more, "+$hidden more")
        }
      }

      val launchIntent =
        context.packageManager.getLaunchIntentForPackage(context.packageName)
          ?: Intent()
      launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      val pending =
        PendingIntent.getActivity(
          context,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
      views.setOnClickPendingIntent(R.id.widget_root, pending)
      views.setOnClickPendingIntent(R.id.widget_date, pending)
      return views
    }

    private fun buildDisplayItems(rows: JSONArray): List<DisplayItem> {
      val allDay = mutableListOf<JSONObject>()
      val scheduled = mutableListOf<JSONObject>()
      for (index in 0 until rows.length()) {
        val row = rows.optJSONObject(index) ?: continue
        if (row.optString("section") == "scheduled") scheduled += row else allDay += row
      }

      val items = mutableListOf<DisplayItem>()
      if (allDay.isNotEmpty()) {
        items += DisplayItem.Section("All day")
        allDay.forEach { items += DisplayItem.Row(it) }
      }
      if (scheduled.isNotEmpty()) {
        items += DisplayItem.Section("Scheduled")
        scheduled.forEach { items += DisplayItem.Row(it) }
      }
      return items
    }

    private fun bindRow(
      context: Context,
      views: RemoteViews,
      slot: SlotIds,
      row: JSONObject,
      requestCode: Int,
    ) {
      val completed = row.optBoolean("completed")
      val late = row.optBoolean("late")
      val source = row.optString("source", "agenda")
      val checkable = row.optBoolean("checkable", source == "agenda")
      val time = row.optString("time").orEmpty().ifBlank { null }
      val title = row.optString("title", "Untitled")
      val icon =
        when {
          checkable -> checkboxBitmap(context, completed)
          else -> clockBitmap(context, late && !completed)
        }
      val color = if (completed) COLOR_MUTED else COLOR_TEXT
      val timeColor = if (late && !completed) COLOR_DANGER else COLOR_MUTED
      val label =
        if (completed) {
          SpannableString(title).apply {
            setSpan(StrikethroughSpan(), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
          }
        } else {
          title
        }

      views.setViewVisibility(slot.row, View.VISIBLE)
      views.setImageViewBitmap(slot.icon, icon)
      views.setContentDescription(slot.icon, if (checkable) "Toggle ${title}" else title)
      views.setTextViewText(slot.text, label)
      views.setTextColor(slot.text, color)
      if (time != null && row.optString("section") == "scheduled") {
        views.setViewVisibility(slot.time, View.VISIBLE)
        views.setTextViewText(slot.time, time)
        views.setTextColor(slot.time, timeColor)
      } else {
        views.setViewVisibility(slot.time, View.GONE)
        views.setTextViewText(slot.time, "")
      }

      if (checkable) {
        val toggleIntent =
          Intent(context, AgendaWidgetReceiver::class.java).apply {
            action = ACTION_TOGGLE
            putExtra(EXTRA_ITEM_ID, row.optString("id"))
          }
        val togglePending =
          PendingIntent.getBroadcast(
            context,
            requestCode + 100,
            toggleIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          )
        views.setOnClickPendingIntent(slot.icon, togglePending)
        views.setOnClickPendingIntent(slot.row, togglePending)
      } else {
        val launchIntent =
          context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent()
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val launchPending =
          PendingIntent.getActivity(
            context,
            requestCode + 200,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          )
        views.setOnClickPendingIntent(slot.row, launchPending)
      }
    }

    private fun checkboxBitmap(context: Context, checked: Boolean): Bitmap {
      val density = context.resources.displayMetrics.density
      val size = (ICON_DP * density).toInt().coerceAtLeast(1)
      val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      val cx = size / 2f
      val cy = size / 2f
      val strokeWidth = 1.75f * density
      val outer = size / 2f - strokeWidth
      val ring =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.STROKE
          this.strokeWidth = strokeWidth
          color = if (checked) COLOR_ACCENT else COLOR_BORDER
        }
      canvas.drawCircle(cx, cy, outer, ring)
      if (checked) {
        val fill =
          Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = COLOR_ACCENT
          }
        canvas.drawCircle(cx, cy, outer - 3.5f * density, fill)
      }
      return bitmap
    }

    private fun clockBitmap(context: Context, late: Boolean): Bitmap {
      val density = context.resources.displayMetrics.density
      val size = (ICON_DP * density).toInt().coerceAtLeast(1)
      val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      val cx = size / 2f
      val cy = size / 2f
      val color = if (late) COLOR_DANGER else COLOR_MUTED
      val stroke =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.STROKE
          strokeWidth = 1.75f * density
          this.color = color
          strokeCap = Paint.Cap.ROUND
        }
      canvas.drawCircle(cx, cy, size / 2f - 2f * density, stroke)
      val hand =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
          style = Paint.Style.STROKE
          strokeWidth = 1.75f * density
          this.color = color
          strokeCap = Paint.Cap.ROUND
        }
      canvas.drawLine(cx, cy, cx, cy - size * 0.22f, hand)
      canvas.drawLine(cx, cy, cx + size * 0.16f, cy + size * 0.08f, hand)
      return bitmap
    }

    private fun loadSnapshot(context: Context): JSONObject? {
      val preferences =
        context.getSharedPreferences(AgendaWidgetModule.STORE_NAME, Context.MODE_PRIVATE)
      val raw =
        preferences.getString(AgendaWidgetModule.KEY_SNAPSHOT, null)
          ?: preferences.getString(AgendaWidgetModule.KEY_LAST_GOOD, null)
          ?: return null
      val json = JSONObject(raw)
      if (json.optInt("schemaVersion") != 1) return null
      return json
    }

    private fun formatDate(raw: String): String {
      if (raw.isBlank()) return "Agenda"
      return runCatching {
        val parsed = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(raw) ?: return "Agenda"
        SimpleDateFormat("EEEE, MMMM d", Locale.getDefault()).format(parsed)
      }.getOrElse { "Agenda" }
    }
  }
}
