<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title class="text-h5 mb-4">勤怠打刻</v-card-title>
      <v-card-text>
        <v-row align="center">
          <!-- Action Buttons -->
          <v-col cols="12" md="auto">
            <v-btn
              class="mr-2 mb-2"
              color="success"
              prepend-icon="mdi-login-variant"
              @click="clockIn"
              :disabled="status !== '未出勤'"
            >
              出勤
            </v-btn>
            <v-btn
              class="mr-2 mb-2"
              color="error"
              prepend-icon="mdi-logout-variant"
              @click="clockOut"
              :disabled="status === '未出勤'"
            >
              退勤
            </v-btn>
            <v-btn
              class="mr-2 mb-2"
              color="info"
              prepend-icon="mdi-coffee-outline"
              @click="startBreak"
              :disabled="status !== '勤務中'"
            >
              休憩開始
            </v-btn>
            <v-btn
              class="mb-2"
              color="warning"
              prepend-icon="mdi-keyboard-return"
              @click="endBreak(false)"
              :disabled="status !== '休憩中'"
            >
              休憩終了
            </v-btn>
          </v-col>

          <!-- Status Display -->
          <v-col cols="12" md="auto">
            <div class="text-subtitle-1">現在の状態: <strong>{{ status }}</strong></div>
            <div class="text-subtitle-1">本日の総労働時間: <strong>{{ currentWorkTime }}</strong></div>
          </v-col>
        </v-row>

        <v-divider class="my-6"></v-divider>

        <!-- History Table Area -->
        <h3 class="text-h6 mb-4">勤怠履歴</h3>
        <v-data-table
          :headers="historyHeaders"
          :items="formattedAttendanceLog"
          item-key="date"
          class="elevation-1"
          :items-per-page="5"
          :footer-props="{ 'items-per-page-options': [5, 10, 20, -1] }"
        >
          <!-- Use v-slot:item.<key> for Vuetify 3 -->
          <template v-slot:[`item.clockIn`]="{ item }">
            {{ formatTime(item.clockIn) }}
          </template>
          <template v-slot:[`item.clockOut`]="{ item }">
            {{ formatTime(item.clockOut) }}
          </template>
           <template v-slot:[`item.breaks`]="{ item }">
             {{ calculateTotalBreakDuration(item.breaks) }}
           </template>
          <!-- item.totalWorkTime should already be formatted -->
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { formatTime, formatDuration, getCurrentDateString } from '../utils/dateUtils';
import { loadAttendanceLog, saveAttendanceLog, findTodayRecord, upsertTodayRecord } from '../utils/storage';

// --- Table Headers ---
const historyHeaders = ref([
  { title: '日付', key: 'date', sortable: true, align: 'start' },
  { title: '出勤時刻', key: 'clockIn', sortable: false, align: 'center' },
  { title: '退勤時刻', key: 'clockOut', sortable: false, align: 'center' },
  { title: '休憩時間', key: 'breaks', sortable: false, align: 'center' },
  { title: '総労働時間', key: 'totalWorkTime', sortable: false, align: 'center' },
]);

// --- State ---
const status = ref('未出勤'); // '未出勤', '勤務中', '休憩中'
const clockInTime = ref(null); // Stores Date object or null
const clockOutTime = ref(null); // Stores Date object or null
const breakStartTime = ref(null); // Stores Date object or null
const breaks = ref([]); // Stores { start: Date, end: Date | null } for today
const attendanceLog = ref([]); // Stores all historical records
const currentWorkTime = ref('00:00:00'); // Displayed work time string
let timerInterval = null;

// --- Computed Properties ---
// Prepare attendance log for display (ensure dates are handled correctly for formatting)
const formattedAttendanceLog = computed(() => {
  // Sort by date descending for display
  return [...attendanceLog.value].sort((a, b) => b.date.localeCompare(a.date));
});

// Calculate total break time for today in milliseconds
const totalBreakTimeMs = computed(() => {
  return breaks.value.reduce((total, br) => {
    if (br.end) {
      return total + (new Date(br.end).getTime() - new Date(br.start).getTime());
    }
    // If break is ongoing, calculate duration up to now
    if (status.value === '休憩中' && br.start === breakStartTime.value) {
       return total + (new Date().getTime() - new Date(br.start).getTime());
    }
    return total;
  }, 0);
});

// Calculate total work time for today in milliseconds
const totalWorkTimeMs = computed(() => {
  if (!clockInTime.value) return 0;

  const now = new Date();
  // Use clockOutTime if available, otherwise use current time (or break start time if on break)
  const endTime = clockOutTime.value ? new Date(clockOutTime.value) : (status.value === '休憩中' ? new Date(breakStartTime.value) : now);
  const grossDuration = endTime.getTime() - new Date(clockInTime.value).getTime();

  // Adjust break time calculation if clock out happened during a break
  let effectiveBreakTime = totalBreakTimeMs.value;
   if (clockOutTime.value && status.value === '未出勤' && breaks.value.length > 0) {
       const lastBreak = breaks.value[breaks.value.length - 1];
       if (!lastBreak.end && new Date(lastBreak.start) < new Date(clockOutTime.value)) {
           // If clocked out while on break, cap break duration at clock out time
           const lastBreakStartMs = new Date(lastBreak.start).getTime();
           const clockOutMs = new Date(clockOutTime.value).getTime();
           effectiveBreakTime = breaks.value.slice(0, -1).reduce((total, br) => total + (new Date(br.end).getTime() - new Date(br.start).getTime()), 0)
                               + (clockOutMs - lastBreakStartMs);
       }
   }


  return Math.max(0, grossDuration - effectiveBreakTime);
});

// Helper function for displaying total break duration in the table
function calculateTotalBreakDuration(breakArray) {
    if (!breakArray || breakArray.length === 0) return '00:00:00';
    const totalMs = breakArray.reduce((total, br) => {
        if (br.start && br.end) {
             // When loading from storage, these are strings, convert them
            const start = new Date(br.start);
            const end = new Date(br.end);
            // Basic check for valid dates before calculation
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return total + (end.getTime() - start.getTime());
            }
        }
        return total;
    }, 0);
    return formatDuration(totalMs);
}

// --- Methods ---
function updateCurrentWorkTime() {
  currentWorkTime.value = formatDuration(totalWorkTimeMs.value);
}

function startTimer() {
  if (!timerInterval) {
    updateCurrentWorkTime(); // Update immediately
    timerInterval = setInterval(updateCurrentWorkTime, 1000);
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    updateCurrentWorkTime(); // Final update
  }
}

function getTodayRecord() {
    const todayDate = getCurrentDateString();
    let record = findTodayRecord(attendanceLog.value, todayDate);
    if (!record) {
        record = {
            date: todayDate,
            clockIn: null,
            clockOut: null,
            breaks: [], // Store breaks as { start: ISOString, end: ISOString | null }
            totalWorkTime: '00:00:00'
        };
    } else {
        // Ensure dates are Date objects when working with them in memory
        record.clockIn = record.clockIn ? new Date(record.clockIn) : null;
        record.clockOut = record.clockOut ? new Date(record.clockOut) : null;
        record.breaks = record.breaks.map(b => ({
            start: new Date(b.start),
            end: b.end ? new Date(b.end) : null
        }));
    }
    return record;
}

function saveCurrentState() {
    const todayRecord = getTodayRecord();
    todayRecord.clockIn = clockInTime.value ? clockInTime.value.toISOString() : null;
    todayRecord.clockOut = clockOutTime.value ? clockOutTime.value.toISOString() : null;
    // Map Date objects back to ISO strings for storage
    todayRecord.breaks = breaks.value.map(b => ({
        start: b.start.toISOString(),
        end: b.end ? b.end.toISOString() : null
    }));
    todayRecord.totalWorkTime = formatDuration(totalWorkTimeMs.value); // Save final calculated time

    upsertTodayRecord(attendanceLog.value, todayRecord);
    saveAttendanceLog(attendanceLog.value); // Save the whole log
}


function clockIn() {
  if (status.value === '未出勤') {
    status.value = '勤務中';
    const now = new Date();
    clockInTime.value = now;
    clockOutTime.value = null; // Reset clock out time
    breaks.value = []; // Reset breaks for the new session
    console.log('Clocked In:', formatTime(now));
    startTimer();
    saveCurrentState();
  } else {
    console.warn('Invalid action: Already clocked in or on break.');
  }
}

function clockOut() {
  if (status.value === '勤務中' || status.value === '休憩中') {
    if (status.value === '休憩中') {
      endBreak(true); // End break implicitly
    }
    const now = new Date();
    clockOutTime.value = now;
    status.value = '未出勤'; // Set status after potential endBreak call
    console.log('Clocked Out:', formatTime(now));
    stopTimer(); // Stop timer after final calculation
    saveCurrentState(); // Save final state including calculated totalWorkTime
    // Reset for next session potentially (or handle in load)
    // clockInTime.value = null;
    // breaks.value = [];
  } else {
    console.warn('Invalid action: Not clocked in.');
  }
}

function startBreak() {
  if (status.value === '勤務中') {
    status.value = '休憩中';
    const now = new Date();
    breakStartTime.value = now;
    breaks.value.push({ start: now, end: null }); // Add new break record
    console.log('Break Started:', formatTime(now));
    stopTimer(); // Pause timer display update
    saveCurrentState();
  } else {
    console.warn('Invalid action: Not clocked in or already on break.');
  }
}

function endBreak(isClockingOut = false) {
  if (status.value === '休憩中') {
    status.value = '勤務中';
    const now = new Date();
    const currentBreak = breaks.value.find(b => b.start === breakStartTime.value && !b.end);
    if (currentBreak) {
        currentBreak.end = now;
    }
    breakStartTime.value = null; // Reset current break start time
    console.log('Break Ended:', formatTime(now));
    if (!isClockingOut) {
        startTimer(); // Resume timer display update
    }
    saveCurrentState();
    if (isClockingOut) {
        console.log('Implicitly ended break due to clock out.');
    }
  } else if (!isClockingOut) {
    console.warn('Invalid action: Not on break.');
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  attendanceLog.value = loadAttendanceLog();
  const todayRecord = getTodayRecord(); // Get or create today's record structure

  // Restore state from today's record
  if (todayRecord.clockIn) {
    clockInTime.value = new Date(todayRecord.clockIn);
    breaks.value = todayRecord.breaks.map(b => ({ // Restore breaks with Date objects
        start: new Date(b.start),
        end: b.end ? new Date(b.end) : null
    }));

    if (todayRecord.clockOut) {
      // Already clocked out today
      clockOutTime.value = new Date(todayRecord.clockOut);
      status.value = '未出勤';
      updateCurrentWorkTime(); // Show final time for the day
    } else {
      // Still clocked in or on break
      const lastBreak = breaks.value.length > 0 ? breaks.value[breaks.value.length - 1] : null;
      if (lastBreak && !lastBreak.end) {
        // Was on break
        status.value = '休憩中';
        breakStartTime.value = new Date(lastBreak.start);
        updateCurrentWorkTime(); // Update display based on break start
      } else {
        // Was working
        status.value = '勤務中';
        startTimer(); // Start timer to update display
      }
    }
  } else {
    // Not clocked in yet today
    status.value = '未出勤';
    currentWorkTime.value = '00:00:00';
  }
});

onUnmounted(() => {
  stopTimer(); // Clean up timer on component unmount
});

</script>

<style scoped>
/* Add component-specific styles if needed */
.text-subtitle-1 {
  margin-bottom: 8px;
}
</style>
