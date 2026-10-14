package com.drruvari.agenda.data

enum class AgendaItemType { TASK, EVENT, NOTE }
enum class Priority { NONE, LOW, MEDIUM, HIGH }

data class Space(
    val id: String,
    val name: String,
    val color: String,
    val icon: String?,
    val isPinned: Boolean,
    val isSystem: Boolean,
    val order: Int,
    val createdAt: String,
)

data class AgendaItem(
    val id: String,
    val type: AgendaItemType,
    val title: String,
    val details: String?,
    val spaceId: String?,
    val priority: Priority,
    val date: String,
    val time: String?,
    val reminderAt: String?,
    val deviceEventId: String?,
    val notificationId: String?,
    val completed: Boolean?,
    val completedAt: String?,
    val durationMinutes: Int?,
    val recurrence: String?,
    val createdAt: String,
    val updatedAt: String,
)

data class Routine(
    val id: String,
    val name: String,
    val spaceId: String?,
    val order: Int,
    val active: Boolean,
    val createdAt: String,
    val updatedAt: String,
)
