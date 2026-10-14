package com.drruvari.agenda

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.LibraryBooks
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Circle
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.drruvari.agenda.data.AgendaDatabase
import com.drruvari.agenda.data.AgendaItem
import com.drruvari.agenda.data.AgendaItemType
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val database = AgendaDatabase(applicationContext)
        setContent { MaterialTheme { AgendaApp { AgendaViewModel(database) } } }
    }
}

class AgendaViewModel(private val database: AgendaDatabase) : ViewModel() {
    private val _items = MutableStateFlow<List<AgendaItem>>(emptyList())
    val items = _items.asStateFlow()
    private val _results = MutableStateFlow<List<AgendaItem>>(emptyList())
    val results = _results.asStateFlow()
    var note by mutableStateOf("")
    var selectedDate by mutableStateOf(LocalDate.now().toString())
        private set

    suspend fun reload() = withContext(Dispatchers.IO) { _items.value = database.itemsForDate(selectedDate) }
    suspend fun toggle(item: AgendaItem) = withContext(Dispatchers.IO) {
        if (item.type == AgendaItemType.TASK) database.setTaskCompleted(item.id, !(item.completed ?: false))
        _items.value = database.itemsForDate(selectedDate)
    }
    suspend fun create(title: String, type: AgendaItemType, time: String?) = withContext(Dispatchers.IO) { database.createItem(title, type, selectedDate, time); _items.value = database.itemsForDate(selectedDate) }
    suspend fun delete(item: AgendaItem) = withContext(Dispatchers.IO) { database.deleteItem(item.id); _items.value = database.itemsForDate(selectedDate) }
    suspend fun search(query: String) = withContext(Dispatchers.IO) { _results.value = if (query.isBlank()) emptyList() else database.search(query) }
    suspend fun loadNote() = withContext(Dispatchers.IO) { note = database.dailyNote(selectedDate) }
    suspend fun saveNote() = withContext(Dispatchers.IO) { database.saveDailyNote(selectedDate, note) }
}

private enum class Destination(val label: String, val icon: ImageVector) {
    Agenda("Agenda", Icons.Outlined.CalendarMonth), Page("Page", Icons.Outlined.Description),
    Library("Library", Icons.AutoMirrored.Outlined.LibraryBooks),
}

@Composable
private fun AgendaApp(factory: () -> AgendaViewModel) {
    val model: AgendaViewModel = viewModel { factory() }
    var destination by mutableStateOf(Destination.Agenda)
    Scaffold(bottomBar = {
        NavigationBar { Destination.entries.forEach { item ->
            NavigationBarItem(selected = destination == item, onClick = { destination = item }, icon = { Icon(item.icon, null) }, label = { Text(item.label) })
        } }
    }) { padding ->
        when (destination) {
            Destination.Agenda -> TodayScreen(model, Modifier.padding(padding))
            Destination.Page -> PageScreen(model, Modifier.padding(padding))
            Destination.Library -> LibraryScreen(model, Modifier.padding(padding))
        }
    }
}

@Composable
private fun TodayScreen(model: AgendaViewModel, modifier: Modifier = Modifier) {
    val items by model.items.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    var adding by remember { mutableStateOf(false) }
    LaunchedEffect(model.selectedDate) { model.reload() }
    Scaffold(modifier = modifier, floatingActionButton = { FloatingActionButton(onClick = { adding = true }) { Text("+") } }) { inner -> Column(Modifier.fillMaxSize().padding(inner).padding(horizontal = 20.dp, vertical = 12.dp)) {
        Text("Today", style = MaterialTheme.typography.headlineLarge)
        if (items.isEmpty()) Text("Nothing scheduled", modifier = Modifier.padding(top = 32.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
        LazyColumn(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            items(items, key = AgendaItem::id) { item ->
                TextButton(onClick = { scope.launch { model.toggle(item) } }, modifier = Modifier.fillMaxWidth()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(if (item.type == AgendaItemType.TASK && item.completed == true) Icons.Outlined.CheckCircle else if (item.type == AgendaItemType.TASK) Icons.Outlined.Circle else Icons.Outlined.CalendarMonth, null)
                        Column { Text(item.title, textDecoration = if (item.completed == true) TextDecoration.LineThrough else null); item.time?.let { Text(it, style = MaterialTheme.typography.labelSmall) } }
                    }
                }
            }
        }
    } }
    if (adding) AddDialog(onDismiss = { adding = false }) { title, type, time -> scope.launch { model.create(title, type, time); adding = false } }
}

@Composable
private fun AddDialog(onDismiss: () -> Unit, onSave: (String, AgendaItemType, String?) -> Unit) {
    var title by remember { mutableStateOf("") }; var time by remember { mutableStateOf("") }; var type by remember { mutableStateOf(AgendaItemType.TASK) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text("New item") }, text = { Column { OutlinedTextField(title, { title = it }, label = { Text("Title") }); OutlinedTextField(time, { time = it }, label = { Text("Time (HH:mm)") }); AgendaItemType.entries.forEach { Row { RadioButton(type == it, { type = it }); Text(it.name.lowercase().replaceFirstChar(Char::uppercase), Modifier.padding(top = 12.dp)) } } } }, confirmButton = { Button(onClick = { onSave(title, type, time.ifBlank { null }) }, enabled = title.isNotBlank()) { Text("Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable private fun PageScreen(model: AgendaViewModel, modifier: Modifier) {
    val scope = rememberCoroutineScope(); LaunchedEffect(model.selectedDate) { model.loadNote() }
    Column(modifier.fillMaxSize().padding(20.dp)) { Text("Daily Page", style = MaterialTheme.typography.headlineLarge); OutlinedTextField(model.note, { model.note = it }, modifier = Modifier.fillMaxWidth().weight(1f), label = { Text("Notes") }); Button(onClick = { scope.launch { model.saveNote() } }) { Text("Save") } }
}

@Composable private fun LibraryScreen(model: AgendaViewModel, modifier: Modifier) {
    val items by model.items.collectAsStateWithLifecycle()
    val results by model.results.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    var settings by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { model.reload() }
    LaunchedEffect(query) { model.search(query) }
    Column(modifier.fillMaxSize().padding(20.dp)) {
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) {
            Text("Library", style = MaterialTheme.typography.headlineLarge)
            TextButton(onClick={settings=!settings}) { Icon(Icons.Outlined.Settings,null);Text("Settings") }
        }
        OutlinedTextField(query,{query=it},label={Text("Search")},leadingIcon={Icon(Icons.Outlined.Search,null)},modifier=Modifier.fillMaxWidth())
        if(settings) { Text("Agenda stores your data locally on this device.",Modifier.padding(vertical=16.dp),color=MaterialTheme.colorScheme.onSurfaceVariant) }
        LazyColumn { items(if(query.isBlank()) items else results) { Text("${it.title}  ·  ${it.date}", Modifier.padding(vertical = 12.dp)) } }
    }
}

@Composable private fun SearchScreen(model: AgendaViewModel, modifier: Modifier) {
    var query by remember { mutableStateOf("") }; val results by model.results.collectAsStateWithLifecycle(); LaunchedEffect(query) { model.search(query) }
    Column(modifier.fillMaxSize().padding(20.dp)) { Text("Search", style = MaterialTheme.typography.headlineLarge); OutlinedTextField(query, { query = it }, label = { Text("Search agenda") }, modifier = Modifier.fillMaxWidth()); LazyColumn { items(results) { Text("${it.title}  ·  ${it.date}", Modifier.padding(vertical = 12.dp)) } } }
}

@Composable private fun SettingsScreen(modifier: Modifier) {
    Column(modifier.fillMaxSize().padding(20.dp)) { Text("Settings", style = MaterialTheme.typography.headlineLarge); Text("Agenda stores your data locally on this device.", Modifier.padding(top = 24.dp)); Text("Database: agenda.v3.db", color = MaterialTheme.colorScheme.onSurfaceVariant) }
}
