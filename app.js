// 全局变量
let timerInterval;
let totalSeconds = 25 * 60; // 默认25分钟
let currentSeconds = totalSeconds;
let isBreakTime = false;
let isPaused = false;
let currentTaskId = null;
let completedPomodoros = 0;
let tasks = [];  // 初始化为空数组
let expectedPomodoros = 0;
let isLongBreak = false;
let startTime = null;
let appData = {};  // 存储应用数据的对象

// DOM元素
const minutesDisplay = document.getElementById('minutes');
const secondsDisplay = document.getElementById('seconds');
const timerStatus = document.getElementById('timer-status');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const progressBar = document.getElementById('progress-bar');
const tasksList = document.getElementById('tasks-list');
const addTaskBtn = document.getElementById('add-task-btn');
const saveTaskBtn = document.getElementById('save-task-btn');
const overlay = document.getElementById('overlay');
const addTaskModal = document.getElementById('add-task-modal');
const taskCompleteModal = document.getElementById('task-complete-modal');
const pomodoroCompleteModal = document.getElementById('pomodoro-complete-modal');
const breakCompleteModal = document.getElementById('break-complete-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const closeCompleteModalBtn = document.getElementById('close-complete-modal-btn');
const startBreakBtn = document.getElementById('start-break-btn');
const startNextPomodoroBtn = document.getElementById('start-next-pomodoro-btn');
const confirmCompleteBtn = document.getElementById('confirm-complete-btn');
const exportHistoryBtn = document.getElementById('export-history-btn');

// 初始化页面
document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('开始初始化页面...');
        
        // 检查登录状态
        if (!API.getToken()) {
            console.log('未登录，跳转到登录页面');
            window.location.href = 'login.html';
            return;
        }

        // 加载任务
        await loadTasks();
        
        // 恢复计时器状态
        restoreTimerState();
        
        // 渲染任务列表
        renderTasks();
        
        console.log('初始化完成，当前任务列表:', tasks);
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 事件监听器
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', togglePause);
resetBtn.addEventListener('click', resetTimer);
addTaskBtn.addEventListener('click', showAddTaskModal);
closeModalBtn.addEventListener('click', hideAddTaskModal);
closeCompleteModalBtn.addEventListener('click', hideTaskCompleteModal);
saveTaskBtn.addEventListener('click', saveNewTask);
startBreakBtn.addEventListener('click', startBreak);
startNextPomodoroBtn.addEventListener('click', startNextPomodoro);
confirmCompleteBtn.addEventListener('click', confirmTaskComplete);
if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', exportHistoryData);
}

// 格式化时间
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return {
        minutes: mins < 10 ? `0${mins}` : mins,
        seconds: secs < 10 ? `0${secs}` : secs
    };
}

// 更新计时器显示
function updateTimerDisplay() {
    const time = formatTime(currentSeconds);
    minutesDisplay.textContent = time.minutes;
    secondsDisplay.textContent = time.seconds;
    
    // 更新进度条
    const progress = ((totalSeconds - currentSeconds) / totalSeconds) * 100;
    progressBar.style.width = `${progress}%`;

    // 更新番茄进度显示
    if (currentTaskId) {
        const task = tasks.find(t => t.id === currentTaskId);
        if (task) {
            timerStatus.innerHTML = `${isBreakTime ? '休息时间' : '工作时间'} (${completedPomodoros}/${task.expectedPomodoros})`;
        }
    }
}

// 开始计时器
function startTimer() {
    if (timerInterval) return;
    
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    resetBtn.disabled = false;
    
    if (!isBreakTime) {
        timerStatus.textContent = '工作时间';
    } else {
        timerStatus.textContent = '休息时间';
        document.querySelector('.timer').classList.add('break-time');
        if (isLongBreak) {
            document.querySelector('.timer').classList.add('long-break');
        }
    }

    startTime = new Date();
    
    timerInterval = setInterval(() => {
        if (currentSeconds > 0) {
            currentSeconds--;
            updateTimerDisplay();
            saveTimerState();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            handleTimerComplete();
        }
    }, 1000);
}

// 切换暂停状态
function togglePause() {
    if (isPaused) {
        // 恢复计时器
        isPaused = false;
        pauseBtn.textContent = '暂停';
        startTimer();
    } else {
        // 暂停计时器
        isPaused = true;
        pauseBtn.textContent = '继续';
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        startTime = null;
    }
    saveTimerState();
}

// 重置计时器
function resetTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    isPaused = false;
    startTime = null;
    
    if (!isBreakTime) {
        currentSeconds = 25 * 60;
        totalSeconds = 25 * 60;
    } else {
        currentSeconds = isLongBreak ? 15 * 60 : 5 * 60;
        totalSeconds = isLongBreak ? 15 * 60 : 5 * 60;
    }
    
    updateTimerDisplay();
    saveTimerState();
    
    pauseBtn.textContent = '暂停';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    resetBtn.disabled = true;
}

// 处理计时器完成
function handleTimerComplete() {
    if (!isBreakTime) {
        // 工作时间结束，显示完成模态框
        completedPomodoros++;
        showPomodoroCompleteModal();
        
        // 播放音效
        playNotificationSound();
    } else {
        // 休息时间结束
        isBreakTime = false;
        document.querySelector('.timer').classList.remove('break-time');
        showBreakCompleteModal();
        
        // 播放音效
        playNotificationSound();
    }
    
    updateActiveTaskDisplay();
}

// 显示番茄钟完成模态框
function showPomodoroCompleteModal() {
    pomodoroCompleteModal.style.display = 'block';
    overlay.style.display = 'block';
}

// 显示休息完成模态框
function showBreakCompleteModal() {
    breakCompleteModal.style.display = 'block';
    overlay.style.display = 'block';
}

// 开始休息
function startBreak() {
    isBreakTime = true;
    
    // 每4个番茄钟后进入15分钟大休息
    if (completedPomodoros > 0 && completedPomodoros % 4 === 0) {
        isLongBreak = true;
        currentSeconds = 15 * 60; // 15分钟休息
        totalSeconds = 15 * 60;
        timerStatus.textContent = '长休息时间 (15分钟)';
    } else {
        isLongBreak = false;
        currentSeconds = 5 * 60; // 5分钟休息
        totalSeconds = 5 * 60;
        timerStatus.textContent = '短休息时间 (5分钟)';
    }
    
    hidePomodoroCompleteModal();
    document.querySelector('.timer').classList.add('break-time');
    updateTimerDisplay();
    startTimer();
}

// 开始下一个番茄钟
function startNextPomodoro() {
    isBreakTime = false;
    currentSeconds = 25 * 60; // 25分钟工作
    totalSeconds = 25 * 60;
    
    hideBreakCompleteModal();
    document.querySelector('.timer').classList.remove('break-time');
    timerStatus.textContent = '工作时间';
    
    updateTimerDisplay();
    startTimer();
}

// 隐藏番茄钟完成模态框
function hidePomodoroCompleteModal() {
    pomodoroCompleteModal.style.display = 'none';
    overlay.style.display = 'none';
}

// 隐藏休息完成模态框
function hideBreakCompleteModal() {
    breakCompleteModal.style.display = 'none';
    overlay.style.display = 'none';
}

// 显示添加任务模态框
function showAddTaskModal() {
    addTaskModal.style.display = 'block';
    overlay.style.display = 'block';
    document.getElementById('task-name').focus();
}

// 隐藏添加任务模态框
function hideAddTaskModal() {
    addTaskModal.style.display = 'none';
    overlay.style.display = 'none';
    document.getElementById('task-name').value = '';
    document.getElementById('pomodoro-count').value = '1';
}

// 显示任务完成模态框
function showTaskCompleteModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    document.getElementById('completed-task-name').textContent = task.name;
    document.getElementById('expected-pomodoros').textContent = task.expectedPomodoros;
    document.getElementById('actual-pomodoros').textContent = completedPomodoros;
    
    const difference = completedPomodoros - task.expectedPomodoros;
    const differenceText = difference > 0 
        ? `多了 ${difference} 个`
        : difference < 0 
            ? `少了 ${Math.abs(difference)} 个` 
            : `正好`;
    
    document.getElementById('pomodoro-difference').textContent = differenceText;
    
    taskCompleteModal.style.display = 'block';
    overlay.style.display = 'block';
}

// 隐藏任务完成模态框
function hideTaskCompleteModal() {
    taskCompleteModal.style.display = 'none';
    overlay.style.display = 'none';
}

// 保存新任务
async function saveNewTask() {
    const taskName = document.getElementById('task-name').value.trim();
    const pomodoroCount = parseInt(document.getElementById('pomodoro-count').value);
    
    if (!taskName) {
        alert('请输入任务名称');
        return;
    }
    
    if (isNaN(pomodoroCount) || pomodoroCount < 1) {
        alert('请输入有效的番茄数量');
        return;
    }
    
    const newTask = {
        name: taskName,
        expectedPomodoros: pomodoroCount,
        completed: false,
        actualPomodoros: 0,
        date: new Date().toISOString().split('T')[0]
    };
    
    try {
        // 显示加载状态
        saveTaskBtn.disabled = true;
        saveTaskBtn.textContent = '保存中...';
        
        // 调用API创建任务
        const response = await API.createTask(newTask);
        if (response.success && response.data) {
            // 确保返回的数据包含所有必要字段
            const savedTask = {
                ...newTask,
                ...response.data,
                id: response.data.id || response.data._id // 处理可能的 _id 字段
            };
            
            // 添加到任务列表
            tasks.push(savedTask);
            saveTasks(); // 保存到本地存储作为缓存
            renderTasks();
            hideAddTaskModal();
            
            // 清空输入框
            document.getElementById('task-name').value = '';
            document.getElementById('pomodoro-count').value = '1';
        } else {
            throw new Error(response.message || '创建任务失败');
        }
    } catch (error) {
        console.error('创建任务失败:', error);
        alert('创建任务失败，请稍后重试');
    } finally {
        // 恢复按钮状态
        saveTaskBtn.disabled = false;
        saveTaskBtn.textContent = '保存';
    }
}

// 渲染任务列表
function renderTasks() {
    console.log('开始渲染任务列表...');
    console.log('当前任务列表:', tasks);
    
    tasksList.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        console.log('没有任务数据');
        tasksList.innerHTML = `
            <div class="no-tasks-message">
                <p>还没有添加任务哦，点击"添加任务"开始吧！</p>
            </div>
        `;
        return;
    }
    
    // 过滤出今天的任务
    const today = new Date().toISOString().split('T')[0];
    console.log('今天的日期:', today);
    
    const todayTasks = tasks.filter(task => {
        const taskDate = task.date ? task.date.split('T')[0] : null;
        console.log('比较任务日期:', taskDate, '与今天:', today);
        return taskDate === today;
    });
    
    console.log('今天的任务:', todayTasks);
    
    if (todayTasks.length === 0) {
        console.log('今天没有任务');
        tasksList.innerHTML = `
            <div class="no-tasks-message">
                <p>今天还没有添加任务哦，点击"添加任务"开始吧！</p>
            </div>
        `;
        return;
    }
    
    todayTasks.forEach(task => {
        console.log('渲染任务:', task);
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''} ${task.id === currentTaskId ? 'task-active' : ''}`;
        
        const progressText = task.id === currentTaskId ? 
            `(${completedPomodoros}/${task.expectedPomodoros})` : 
            task.completed ? 
                `(完成: ${task.actualPomodoros}/${task.expectedPomodoros})` : 
                `(预计: ${task.expectedPomodoros})`;
        
        taskElement.innerHTML = `
            <div class="task-info">
                <div class="task-name">${task.name}</div>
                <div class="task-pomodoros">
                    番茄进度：${progressText}
                </div>
            </div>
            <div class="task-actions">
                ${!task.completed ? `
                    <button class="task-btn start-btn" onclick="startTask('${task.id}')">
                        <i class="fas fa-play"></i>
                        ${task.id === currentTaskId ? '重新开始' : '开始'}
                    </button>
                    <button class="task-btn delete-btn" onclick="deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                        删除
                    </button>
                    <button class="task-btn complete-btn" onclick="completeTask('${task.id}')">
                        <i class="fas fa-check"></i>
                        完成
                    </button>
                ` : `
                    <button class="task-btn delete-btn" onclick="deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                        删除
                    </button>
                `}
            </div>
        `;
        
        tasksList.appendChild(taskElement);
    });
    
    console.log('任务列表渲染完成');
}

// 删除任务
async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }
    
    try {
        const response = await API.deleteTask(taskId);
        if (response.success) {
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks(); // 更新本地缓存
            renderTasks();
            
            // 如果删除的是当前任务，重置计时器状态
            if (taskId === currentTaskId) {
                resetTaskState();
            }
        } else {
            alert('删除任务失败：' + (response.message || '未知错误'));
        }
    } catch (error) {
        console.error('删除任务失败:', error);
        alert('删除任务失败，请稍后重试');
    }
}

// 开始任务
async function startTask(taskId) {
    try {
        // 获取最新的任务信息
        const response = await API.getTask(taskId);
        if (!response.success) {
            throw new Error(response.message || '获取任务信息失败');
        }
        
        const task = response.data;
        
        // 重置之前的任务状态
        if (currentTaskId) {
            resetTaskState();
        }
        
        currentTaskId = taskId;
        expectedPomodoros = task.expectedPomodoros;
        completedPomodoros = task.actualPomodoros || 0;
        
        // 重置并开始番茄钟
        resetTimer();
        startTimer();
        
        // 更新UI
        renderTasks();
        updateTimerDisplay();
        
        // 创建新的番茄钟记录
        await API.createPomodoro({
            taskId: taskId,
            startTime: new Date().toISOString(),
            type: 'work'
        });
    } catch (error) {
        console.error('开始任务失败:', error);
        alert('开始任务失败，请稍后重试');
    }
}

// 完成任务
async function completeTask(taskId) {
    try {
        // 停止计时器
        clearInterval(timerInterval);
        timerInterval = null;
        
        // 获取最新的任务信息
        const response = await API.getTask(taskId);
        if (!response.success) {
            throw new Error(response.message || '获取任务信息失败');
        }
        
        // 显示完成模态框
        showTaskCompleteModal(taskId);
    } catch (error) {
        console.error('完成任务失败:', error);
        alert('完成任务失败，请稍后重试');
    }
}

// 确认任务完成
async function confirmTaskComplete() {
    try {
        const taskData = {
            completed: true,
            actualPomodoros: completedPomodoros
        };
        
        // 调用API更新任务状态
        const response = await API.completeTask(currentTaskId, taskData);
        if (response.success) {
            const taskIndex = tasks.findIndex(task => task.id === currentTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex] = response.data;
                saveTasks(); // 更新本地缓存
            }
            
            resetTaskState();
            hideTaskCompleteModal();
            renderTasks();
        } else {
            throw new Error(response.message || '更新任务状态失败');
        }
    } catch (error) {
        console.error('完成任务失败:', error);
        alert('更新任务状态失败，请稍后重试');
    }
}

// 重置任务状态
function resetTaskState() {
    currentTaskId = null;
    completedPomodoros = 0;
    isBreakTime = false;
    isPaused = false;
    document.querySelector('.timer').classList.remove('break-time');
    timerStatus.textContent = '工作时间';
    resetTimer();
}

// 更新当前活动任务的显示
function updateActiveTaskDisplay() {
    const activeTask = tasks.find(task => task.id === currentTaskId);
    if (!activeTask) return;
    
    renderTasks();
}

// 保存任务到本地存储（作为缓存）
function saveTasks() {
    // 保存整个应用状态
    appData.tasks = tasks;
    appData.timerState = {
        currentSeconds,
        totalSeconds,
        isBreakTime,
        isPaused,
        currentTaskId,
        completedPomodoros,
        expectedPomodoros,
        isLongBreak,
        startTime: startTime ? startTime.getTime() : null
    };
    
    localStorage.setItem('pomodoro-app-data', JSON.stringify(appData));
}

// 从本地存储和服务器加载任务
async function loadTasks() {
    try {
        console.log('开始加载任务...');
        // 从API获取任务列表
        const response = await API.getTasks();
        console.log('API返回数据:', response);
        
        if (response.success && Array.isArray(response.data)) {
            // 确保每个任务都有正确的id字段
            tasks = response.data.map(task => ({
                ...task,
                id: task.id || task._id // 处理可能的 _id 字段
            }));
            
            // 更新本地存储作为缓存
            appData.tasks = tasks;
            localStorage.setItem('pomodoro-app-data', JSON.stringify(appData));
            
            console.log('任务加载成功:', tasks);
            return tasks;
        } else {
            throw new Error(response.message || '获取任务列表失败');
        }
    } catch (error) {
        console.error('加载任务失败:', error);
        // 如果API请求失败，尝试从本地缓存加载
        const savedData = localStorage.getItem('pomodoro-app-data');
        if (savedData) {
            try {
                appData = JSON.parse(savedData);
                tasks = appData.tasks || [];
                console.log('从本地缓存加载任务:', tasks);
                return tasks;
            } catch (e) {
                console.error('解析本地缓存失败:', e);
                tasks = [];
                return [];
            }
        }
        tasks = [];
        return [];
    }
}

// 恢复计时器状态
function restoreTimerState() {
    const savedData = localStorage.getItem('pomodoro-app-data');
    if (!savedData) return false;
    
    appData = JSON.parse(savedData);
    if (!appData.timerState) return false;
    
    const state = appData.timerState;
    
    // 如果有开始时间，计算实际剩余时间
    if (state.startTime) {
        const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        currentSeconds = Math.max(0, state.currentSeconds - elapsedSeconds);
    } else {
        currentSeconds = state.currentSeconds;
    }

    totalSeconds = state.totalSeconds;
    isBreakTime = state.isBreakTime;
    isPaused = true; // 恢复时默认暂停
    currentTaskId = state.currentTaskId;
    completedPomodoros = state.completedPomodoros;
    expectedPomodoros = state.expectedPomodoros;
    isLongBreak = state.isLongBreak;

    // 更新UI
    updateTimerDisplay();
    renderTasks();

    return true;
}

// 保存计时器状态
function saveTimerState() {
    // 更新appData中的timerState
    appData.timerState = {
        currentSeconds,
        totalSeconds,
        isBreakTime,
        isPaused,
        currentTaskId,
        completedPomodoros,
        expectedPomodoros,
        isLongBreak,
        startTime: startTime ? startTime.getTime() : null
    };
    
    localStorage.setItem('pomodoro-app-data', JSON.stringify(appData));
}

// 播放通知声音
function playNotificationSound() {
    // 创建音频对象
    const audio = new Audio('data:audio/wav;base64,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');
    audio.play();
}

// 格式化日期函数
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 导出功能
async function exportHistoryData() {
    try {
        // 显示加载状态
        const originalText = exportHistoryBtn.textContent;
        exportHistoryBtn.textContent = '导出中...';
        exportHistoryBtn.disabled = true;
        
        // 获取当前月份的数据
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        
        const startDate = formatDate(start);
        const endDate = formatDate(end);
        
        // 从API获取数据
        const response = await API.exportRange(startDate, endDate);
        
        if (response.success && response.data) {
            // 处理数据
            const csvData = processDataForExport(response.data);
            
            // 下载CSV文件
            const fileName = `pomodoro_history_${startDate}_${endDate}.csv`;
            downloadCSV(csvData, fileName);
        } else {
            throw new Error(response.message || '导出数据失败');
        }
    } catch (error) {
        console.error('导出历史数据失败:', error);
        alert('导出数据失败，请稍后重试');
    } finally {
        // 恢复按钮状态
        exportHistoryBtn.textContent = '导出数据';
        exportHistoryBtn.disabled = false;
    }
}

// 处理导出数据
function processDataForExport(data) {
    const { tasks, pomodoros, dailyStats } = data;
    
    // 创建CSV表头
    let csvContent = '日期,任务名称,预计番茄数,实际番茄数,完成状态,总专注时间(分钟)\n';
    
    // 按日期组织数据
    dailyStats.forEach(stat => {
        const date = stat.date.split('T')[0];
        const dayTasks = tasks.filter(task => task.date === date);
        
        dayTasks.forEach(task => {
            const taskPomodoros = pomodoros.filter(p => p.taskId === task.id);
            const totalFocusTime = taskPomodoros.reduce((acc, p) => acc + p.duration, 0);
            
            csvContent += `${date},${task.name},${task.expectedPomodoros},${task.actualPomodoros},${task.completed ? '已完成' : '未完成'},${totalFocusTime}\n`;
        });
    });
    
    return csvContent;
}

// 下载CSV文件
function downloadCSV(csvContent, fileName) {
    // 添加BOM以支持中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
    
    if (window.navigator.msSaveOrOpenBlob) {
        // IE11
        window.navigator.msSaveBlob(blob, fileName);
    } else {
        // 其他现代浏览器
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

// 更新登出处理
if (document.getElementById('logout-btn')) {
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            await API.logout();
            clearUserData(); // 清除用户数据
            localStorage.removeItem('token');
            window.location.reload();
        } catch (error) {
            console.error('登出失败:', error);
        }
    });
}

// 清除所有用户数据
function clearUserData() {
    // 清除所有数据
    localStorage.removeItem('pomodoro-app-data');
    
    // 重置所有状态
    tasks = [];
    currentTaskId = null;
    completedPomodoros = 0;
    expectedPomodoros = 0;
    isBreakTime = false;
    isPaused = false;
    isLongBreak = false;
    startTime = null;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // 重置计时器显示
    resetTimer();
    renderTasks();
}

// 加载历史任务
async function loadHistoryTasks(dateString) {
    try {
        // 显示加载状态
        historyTasksList.innerHTML = '<div class="loading">加载中...</div>';
        
        // 从API加载指定日期的任务数据
        const response = await API.exportDaily(dateString);
        
        if (response.success && response.data) {
            const { tasks, pomodoros } = response.data;
            
            // 清空列表
            historyTasksList.innerHTML = '';
            
            if (tasks.length === 0) {
                historyTasksList.innerHTML = '<div class="no-tasks-message">这一天没有任务记录</div>';
                return;
            }
            
            // 渲染任务列表
            tasks.forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
                
                taskElement.innerHTML = `
                    <div class="task-info">
                        <div class="task-name">${task.name}</div>
                        <div class="task-pomodoros">
                            <span class="actual">${task.actualPomodoros}</span>
                            /
                            <span class="expected">${task.expectedPomodoros}</span>
                        </div>
                        ${pomodoros ? `
                            <div class="task-time">
                                总专注时间：${formatTime(pomodoros.filter(p => p.taskId === task.id).reduce((acc, p) => acc + p.duration, 0))}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                historyTasksList.appendChild(taskElement);
            });
        }
    } catch (error) {
        console.error('加载历史任务失败:', error);
        historyTasksList.innerHTML = '<div class="error-message">加载失败，请稍后再试</div>';
    }
}

// 加载任务日期
async function loadTaskDates() {
    if (!API.getToken()) return;
    
    try {
        // 计算日期范围（当月及前后一个月）
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month + 2, 0);
        
        const startDate = formatDate(start);
        const endDate = formatDate(end);
        
        // 获取日期范围内的任务数据
        const response = await API.exportRange(startDate, endDate);
        
        if (response.success && response.data) {
            // 提取有任务的日期
            taskDates = response.data.dailyStats
                .filter(stat => stat.tasksCount > 0)
                .map(stat => stat.date.split('T')[0]);
            
            // 重绘日历，添加任务标记
            renderCalendar(currentDate);
        } else {
            throw new Error(response.message || '获取任务日期失败');
        }
    } catch (error) {
        console.error('加载任务日期失败:', error);
        // 如果API请求失败，尝试从本地数据计算任务日期
        taskDates = [...new Set(tasks.map(task => task.date))];
        renderCalendar(currentDate);
    }
}

// 登录成功后的处理
async function handleLoginSuccess(token) {
    API.setToken(token);
    
    // 更新UI状态
    updateAuthState(true);
    
    // 加载用户数据
    await loadUserData();
    
    // 预加载AI分析
    API.getAIAnalysis()
        .then(response => {
            if (response.success && response.data) {
                window.aiAnalysisCache = {
                    stats: response.data.stats,
                    analysis: response.data.analysis,
                    timestamp: Date.now()
                };
            }
        })
        .catch(error => console.error('预加载AI分析失败:', error));
}