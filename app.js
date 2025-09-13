/**
 * Todo App - Main JavaScript
 * Production-quality vanilla JS todo application with offline support
 */

(function() {
    'use strict';

    // =============================================================================
    // Constants & Configuration
    // =============================================================================

    const APP_CONFIG = {
        name: 'TodoApp',
        version: '1.0.0',
        storageKey: 'todo-app-data',
        historySize: 10,
        toastDuration: 3000,
        autosaveDelay: 500,
        naturalLanguagePatterns: {
            today: /\btoday\b/i,
            tomorrow: /\btomorrow\b/i,
            monday: /\bmonday\b/i,
            tuesday: /\btuesday\b/i,
            wednesday: /\bwednesday\b/i,
            thursday: /\bthursday\b/i,
            friday: /\bfriday\b/i,
            saturday: /\bsaturday\b/i,
            sunday: /\bsunday\b/i
        }
    };

    const TASK_PRIORITIES = {
        high: { label: 'High', value: 'high', order: 3 },
        medium: { label: 'Medium', value: 'medium', order: 2 },
        low: { label: 'Low', value: 'low', order: 1 },
        none: { label: 'None', value: '', order: 0 }
    };

    const SORT_OPTIONS = {
        created: 'Created Date',
        due: 'Due Date',
        priority: 'Priority',
        title: 'Title',
        manual: 'Manual Order'
    };

    // =============================================================================
    // Utility Functions
    // =============================================================================

    const Utils = {
        /**
         * Generate a unique ID
         */
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2);
        },

        /**
         * Safely sanitize HTML content
         */
        sanitizeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        /**
         * Deep clone an object
         */
        deepClone(obj) {
            return JSON.parse(JSON.stringify(obj));
        },

        /**
         * Debounce function calls
         */
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        /**
         * Format date for display
         */
        formatDate(dateStr) {
            if (!dateStr) return '';
            
            const date = new Date(dateStr);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            const diffTime = taskDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Tomorrow';
            if (diffDays === -1) return 'Yesterday';
            if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
            if (diffDays < 7) return `${diffDays} days`;
            
            return date.toLocaleDateString();
        },

        /**
         * Parse natural language dates
         */
        parseNaturalDate(text) {
            const now = new Date();
            
            if (APP_CONFIG.naturalLanguagePatterns.today.test(text)) {
                return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
            }
            
            if (APP_CONFIG.naturalLanguagePatterns.tomorrow.test(text)) {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59);
            }
            
            // Check for specific weekdays
            const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            for (let i = 0; i < weekdays.length; i++) {
                if (APP_CONFIG.naturalLanguagePatterns[weekdays[i]].test(text)) {
                    const target = new Date(now);
                    const currentDay = target.getDay();
                    const targetDay = i;
                    const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
                    target.setDate(target.getDate() + daysUntilTarget);
                    return new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59);
                }
            }
            
            return null;
        },

        /**
         * Get relative due date class
         */
        getDueDateClass(dateStr) {
            if (!dateStr) return '';
            
            const date = new Date(dateStr);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            const diffTime = taskDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) return 'overdue';
            if (diffDays === 0) return 'today';
            if (diffDays === 1) return 'tomorrow';
            return '';
        }
    };

    // =============================================================================
    // Storage Module
    // =============================================================================

    const Storage = {
        isIndexedDBSupported: false,
        db: null,
        dbName: 'TodoAppDB',
        version: 1,
        storeName: 'tasks',

        /**
         * Initialize storage
         */
        async init() {
            if ('indexedDB' in window) {
                try {
                    await this.initIndexedDB();
                    this.isIndexedDBSupported = true;
                    console.log('IndexedDB initialized');
                } catch (error) {
                    console.warn('IndexedDB failed, falling back to localStorage:', error);
                    this.isIndexedDBSupported = false;
                }
            } else {
                console.warn('IndexedDB not supported, using localStorage');
                this.isIndexedDBSupported = false;
            }
        },

        /**
         * Initialize IndexedDB
         */
        initIndexedDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve();
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                        store.createIndex('completed', 'completed', { unique: false });
                        store.createIndex('createdAt', 'createdAt', { unique: false });
                        store.createIndex('dueAt', 'dueAt', { unique: false });
                    }
                };
            });
        },

        /**
         * Save data
         */
        async save(data) {
            if (this.isIndexedDBSupported) {
                return this.saveToIndexedDB(data);
            } else {
                return this.saveToLocalStorage(data);
            }
        },

        /**
         * Load data
         */
        async load() {
            if (this.isIndexedDBSupported) {
                return this.loadFromIndexedDB();
            } else {
                return this.loadFromLocalStorage();
            }
        },

        /**
         * Save to IndexedDB
         */
        saveToIndexedDB(data) {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                // Clear existing data
                store.clear();
                
                // Save all tasks
                data.tasks.forEach(task => {
                    store.add(task);
                });
                
                // Save metadata
                store.add({
                    id: '_metadata',
                    currentFilter: data.currentFilter,
                    currentSort: data.currentSort,
                    activeTagFilters: data.activeTagFilters,
                    searchQuery: data.searchQuery,
                    theme: data.theme,
                    version: APP_CONFIG.version
                });
                
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
            });
        },

        /**
         * Load from IndexedDB
         */
        loadFromIndexedDB() {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const items = request.result;
                    const tasks = items.filter(item => item.id !== '_metadata');
                    const metadata = items.find(item => item.id === '_metadata') || {};
                    
                    resolve({
                        tasks,
                        currentFilter: metadata.currentFilter || 'all',
                        currentSort: metadata.currentSort || 'created',
                        activeTagFilters: metadata.activeTagFilters || [],
                        searchQuery: metadata.searchQuery || '',
                        theme: metadata.theme || 'auto',
                        version: metadata.version || '1.0.0'
                    });
                };
                
                request.onerror = () => reject(request.error);
            });
        },

        /**
         * Save to localStorage
         */
        saveToLocalStorage(data) {
            try {
                localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(data));
                return Promise.resolve();
            } catch (error) {
                return Promise.reject(error);
            }
        },

        /**
         * Load from localStorage
         */
        loadFromLocalStorage() {
            try {
                const data = localStorage.getItem(APP_CONFIG.storageKey);
                if (data) {
                    return Promise.resolve(JSON.parse(data));
                } else {
                    return Promise.resolve({
                        tasks: [],
                        currentFilter: 'all',
                        currentSort: 'created',
                        activeTagFilters: [],
                        searchQuery: '',
                        theme: 'auto',
                        version: APP_CONFIG.version
                    });
                }
            } catch (error) {
                return Promise.reject(error);
            }
        },

        /**
         * Export data
         */
        async exportData() {
            const data = await this.load();
            return {
                ...data,
                exportedAt: new Date().toISOString(),
                appVersion: APP_CONFIG.version
            };
        },

        /**
         * Import data
         */
        async importData(importedData) {
            // Validate and sanitize imported data
            if (!importedData.tasks || !Array.isArray(importedData.tasks)) {
                throw new Error('Invalid data format');
            }

            // Merge with existing data
            const existingData = await this.load();
            const mergedTasks = [...existingData.tasks];

            importedData.tasks.forEach(importedTask => {
                // Check if task already exists
                const existingIndex = mergedTasks.findIndex(t => t.id === importedTask.id);
                
                if (existingIndex >= 0) {
                    // Update existing task if imported is newer
                    if (new Date(importedTask.updatedAt) > new Date(mergedTasks[existingIndex].updatedAt)) {
                        mergedTasks[existingIndex] = importedTask;
                    }
                } else {
                    // Add new task
                    mergedTasks.push(importedTask);
                }
            });

            const mergedData = {
                ...existingData,
                tasks: mergedTasks
            };

            await this.save(mergedData);
            return mergedData;
        }
    };

    // =============================================================================
    // State Management
    // =============================================================================

    class StateManager {
        constructor() {
            this.state = {
                tasks: [],
                filteredTasks: [],
                selectedTasks: new Set(),
                currentFilter: 'all',
                currentSort: 'created',
                searchQuery: '',
                activeTagFilters: [],
                theme: 'auto',
                isLoading: true,
                editingTask: null
            };
            this.history = [];
            this.historyIndex = -1;
            this.listeners = [];
            this.debouncedSave = Utils.debounce(() => this.saveToStorage(), APP_CONFIG.autosaveDelay);
        }

        /**
         * Subscribe to state changes
         */
        subscribe(listener) {
            this.listeners.push(listener);
            return () => {
                this.listeners = this.listeners.filter(l => l !== listener);
            };
        }

        /**
         * Emit state change
         */
        emit() {
            this.listeners.forEach(listener => listener(this.state));
        }

        /**
         * Update state
         */
        setState(newState, action = null) {
            const prevState = Utils.deepClone(this.state);
            this.state = { ...this.state, ...newState };
            
            // Add to history for undo/redo
            if (action && action.type !== 'UNDO' && action.type !== 'REDO') {
                this.addToHistory(prevState, action);
            }
            
            // Update filtered tasks when tasks or filters change
            if (newState.tasks || newState.currentFilter !== undefined || 
                newState.searchQuery !== undefined || newState.activeTagFilters) {
                this.updateFilteredTasks();
            }
            
            this.emit();
            this.debouncedSave();
        }

        /**
         * Add action to history
         */
        addToHistory(prevState, action) {
            // Remove any future history if we're not at the end
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            
            this.history.push({ prevState, action });
            
            // Keep history within limits
            if (this.history.length > APP_CONFIG.historySize) {
                this.history.shift();
            } else {
                this.historyIndex++;
            }
        }

        /**
         * Undo last action
         */
        undo() {
            if (this.historyIndex >= 0) {
                const { prevState, action } = this.history[this.historyIndex];
                this.historyIndex--;
                this.setState(prevState, { type: 'UNDO' });
                UI.showToast(`Undone: ${this.getActionDescription(action)}`, 'info');
                return true;
            }
            return false;
        }

        /**
         * Redo last undone action
         */
        redo() {
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                const { action } = this.history[this.historyIndex];
                
                // Re-execute the action
                this.executeAction(action);
                UI.showToast(`Redone: ${this.getActionDescription(action)}`, 'info');
                return true;
            }
            return false;
        }

        /**
         * Execute an action
         */
        executeAction(action) {
            switch (action.type) {
                case 'ADD_TASK':
                    this.addTask(action.task, false);
                    break;
                case 'UPDATE_TASK':
                    this.updateTask(action.taskId, action.updates, false);
                    break;
                case 'DELETE_TASK':
                    this.deleteTask(action.taskId, false);
                    break;
                case 'TOGGLE_COMPLETE':
                    this.toggleTaskComplete(action.taskId, false);
                    break;
                // Add more action types as needed
            }
        }

        /**
         * Get human-readable action description
         */
        getActionDescription(action) {
            switch (action.type) {
                case 'ADD_TASK':
                    return 'Add task';
                case 'UPDATE_TASK':
                    return 'Update task';
                case 'DELETE_TASK':
                    return 'Delete task';
                case 'TOGGLE_COMPLETE':
                    return 'Toggle complete';
                case 'CLEAR_COMPLETED':
                    return 'Clear completed';
                default:
                    return 'Action';
            }
        }

        /**
         * Update filtered tasks based on current filters
         */
        updateFilteredTasks() {
            let filtered = [...this.state.tasks];
            
            // Apply main filter
            switch (this.state.currentFilter) {
                case 'active':
                    filtered = filtered.filter(task => !task.completed);
                    break;
                case 'completed':
                    filtered = filtered.filter(task => task.completed);
                    break;
                // 'all' shows everything
            }
            
            // Apply search filter
            if (this.state.searchQuery.trim()) {
                const query = this.state.searchQuery.toLowerCase();
                filtered = filtered.filter(task => 
                    task.title.toLowerCase().includes(query) ||
                    (task.notes && task.notes.toLowerCase().includes(query)) ||
                    (task.tags && task.tags.some(tag => tag.toLowerCase().includes(query)))
                );
            }
            
            // Apply tag filters
            if (this.state.activeTagFilters.length > 0) {
                filtered = filtered.filter(task =>
                    task.tags && this.state.activeTagFilters.every(filterTag =>
                        task.tags.some(taskTag => taskTag.toLowerCase() === filterTag.toLowerCase())
                    )
                );
            }
            
            // Apply sorting
            filtered = this.sortTasks(filtered, this.state.currentSort);
            
            this.state.filteredTasks = filtered;
        }

        /**
         * Sort tasks
         */
        sortTasks(tasks, sortType) {
            return tasks.sort((a, b) => {
                switch (sortType) {
                    case 'due':
                        // Handle null/undefined due dates
                        if (!a.dueAt && !b.dueAt) return new Date(b.createdAt) - new Date(a.createdAt);
                        if (!a.dueAt) return 1;
                        if (!b.dueAt) return -1;
                        return new Date(a.dueAt) - new Date(b.dueAt);
                    
                    case 'priority':
                        const aPriority = TASK_PRIORITIES[a.priority] || TASK_PRIORITIES.none;
                        const bPriority = TASK_PRIORITIES[b.priority] || TASK_PRIORITIES.none;
                        const priorityDiff = bPriority.order - aPriority.order;
                        return priorityDiff !== 0 ? priorityDiff : new Date(b.createdAt) - new Date(a.createdAt);
                    
                    case 'title':
                        return a.title.localeCompare(b.title);
                    
                    case 'manual':
                        return (a.order || 0) - (b.order || 0);
                    
                    case 'created':
                    default:
                        return new Date(b.createdAt) - new Date(a.createdAt);
                }
            });
        }

        /**
         * Add new task
         */
        addTask(taskData, addToHistory = true) {
            const task = {
                id: Utils.generateId(),
                title: taskData.title.trim(),
                notes: taskData.notes || '',
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                dueAt: taskData.dueAt || null,
                priority: taskData.priority || '',
                tags: taskData.tags || [],
                parentId: taskData.parentId || null,
                order: taskData.order || this.state.tasks.length
            };
            
            const newTasks = [...this.state.tasks, task];
            
            this.setState(
                { tasks: newTasks },
                addToHistory ? { type: 'ADD_TASK', task } : null
            );
            
            return task;
        }

        /**
         * Update existing task
         */
        updateTask(taskId, updates, addToHistory = true) {
            const taskIndex = this.state.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return false;
            
            const updatedTask = {
                ...this.state.tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            const newTasks = [...this.state.tasks];
            newTasks[taskIndex] = updatedTask;
            
            this.setState(
                { tasks: newTasks },
                addToHistory ? { type: 'UPDATE_TASK', taskId, updates } : null
            );
            
            return updatedTask;
        }

        /**
         * Delete task
         */
        deleteTask(taskId, addToHistory = true) {
            const newTasks = this.state.tasks.filter(t => t.id !== taskId);
            
            this.setState(
                { tasks: newTasks },
                addToHistory ? { type: 'DELETE_TASK', taskId } : null
            );
            
            // Clear from selection
            this.state.selectedTasks.delete(taskId);
        }

        /**
         * Toggle task completion
         */
        toggleTaskComplete(taskId, addToHistory = true) {
            const task = this.state.tasks.find(t => t.id === taskId);
            if (!task) return false;
            
            return this.updateTask(
                taskId, 
                { completed: !task.completed },
                addToHistory
            );
        }

        /**
         * Clear completed tasks
         */
        clearCompleted() {
            const completedTasks = this.state.tasks.filter(t => t.completed);
            const newTasks = this.state.tasks.filter(t => !t.completed);
            
            this.setState(
                { tasks: newTasks },
                { type: 'CLEAR_COMPLETED', count: completedTasks.length }
            );
            
            return completedTasks.length;
        }

        /**
         * Bulk operations
         */
        bulkComplete(taskIds) {
            const newTasks = this.state.tasks.map(task =>
                taskIds.includes(task.id)
                    ? { ...task, completed: true, updatedAt: new Date().toISOString() }
                    : task
            );
            
            this.setState(
                { tasks: newTasks },
                { type: 'BULK_COMPLETE', taskIds }
            );
        }

        bulkDelete(taskIds) {
            const newTasks = this.state.tasks.filter(task => !taskIds.includes(task.id));
            
            this.setState(
                { tasks: newTasks },
                { type: 'BULK_DELETE', taskIds }
            );
            
            // Clear from selection
            taskIds.forEach(id => this.state.selectedTasks.delete(id));
        }

        bulkSetPriority(taskIds, priority) {
            const newTasks = this.state.tasks.map(task =>
                taskIds.includes(task.id)
                    ? { ...task, priority, updatedAt: new Date().toISOString() }
                    : task
            );
            
            this.setState(
                { tasks: newTasks },
                { type: 'BULK_SET_PRIORITY', taskIds, priority }
            );
        }

        /**
         * Get all unique tags
         */
        getAllTags() {
            const tagSet = new Set();
            this.state.tasks.forEach(task => {
                if (task.tags) {
                    task.tags.forEach(tag => tagSet.add(tag));
                }
            });
            return Array.from(tagSet).sort();
        }

        /**
         * Load initial data
         */
        async loadData() {
            try {
                const data = await Storage.load();
                this.setState({
                    tasks: data.tasks || [],
                    currentFilter: data.currentFilter || 'all',
                    currentSort: data.currentSort || 'created',
                    activeTagFilters: data.activeTagFilters || [],
                    searchQuery: data.searchQuery || '',
                    theme: data.theme || 'auto',
                    isLoading: false
                });
            } catch (error) {
                console.error('Failed to load data:', error);
                this.setState({ isLoading: false });
                UI.showToast('Failed to load saved tasks', 'error');
            }
        }

        /**
         * Save to storage
         */
        async saveToStorage() {
            if (this.state.isLoading) return;
            
            try {
                await Storage.save({
                    tasks: this.state.tasks,
                    currentFilter: this.state.currentFilter,
                    currentSort: this.state.currentSort,
                    activeTagFilters: this.state.activeTagFilters,
                    searchQuery: this.state.searchQuery,
                    theme: this.state.theme,
                    version: APP_CONFIG.version
                });
            } catch (error) {
                console.error('Failed to save data:', error);
                UI.showToast('Failed to save changes', 'error');
            }
        }
    }

    // =============================================================================
    // User Interface Module
    // =============================================================================

    const UI = {
        elements: {},
        dragState: {
            draggedElement: null,
            draggedTask: null,
            placeholder: null
        },

        /**
         * Initialize UI
         */
        init() {
            this.cacheElements();
            this.bindEvents();
            this.initTheme();
            this.setupKeyboardShortcuts();
            this.setupDragAndDrop();
        },

        /**
         * Cache DOM elements
         */
        cacheElements() {
            this.elements = {
                loading: document.getElementById('loading'),
                app: document.getElementById('app'),
                themeToggle: document.getElementById('theme-toggle'),
                searchInput: document.getElementById('search-input'),
                addTaskForm: document.getElementById('add-task-form'),
                addTaskInput: document.getElementById('add-task-input'),
                dueDateInput: document.getElementById('due-date-input'),
                prioritySelect: document.getElementById('priority-select'),
                tagsInput: document.getElementById('tags-input'),
                filterTabs: document.querySelectorAll('.filter-tab'),
                sortSelect: document.getElementById('sort-select'),
                taskList: document.getElementById('task-list'),
                emptyState: document.getElementById('empty-state'),
                taskCount: document.getElementById('task-count'),
                clearCompleted: document.getElementById('clear-completed'),
                bulkActions: document.getElementById('bulk-actions'),
                bulkComplete: document.getElementById('bulk-complete'),
                bulkDelete: document.getElementById('bulk-delete'),
                bulkPriority: document.getElementById('bulk-priority'),
                activeFilters: document.getElementById('active-filters'),
                modalOverlay: document.getElementById('modal-overlay'),
                editModal: document.getElementById('edit-modal'),
                helpModal: document.getElementById('help-modal'),
                editForm: document.getElementById('edit-task-form'),
                importBtn: document.getElementById('import-btn'),
                exportBtn: document.getElementById('export-btn'),
                helpBtn: document.getElementById('help-btn'),
                importFile: document.getElementById('import-file'),
                toastContainer: document.getElementById('toast-container')
            };
        },

        /**
         * Bind event handlers
         */
        bindEvents() {
            // Theme toggle
            this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
            
            // Search
            this.elements.searchInput.addEventListener('input', (e) => {
                state.setState({ searchQuery: e.target.value });
            });
            
            // Add task form
            this.elements.addTaskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddTask();
            });
            
            // Filter tabs
            this.elements.filterTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.setActiveFilter(tab.dataset.filter);
                });
            });
            
            // Sort select
            this.elements.sortSelect.addEventListener('change', (e) => {
                state.setState({ currentSort: e.target.value });
            });
            
            // Clear completed
            this.elements.clearCompleted.addEventListener('click', () => {
                const count = state.clearCompleted();
                this.showToast(`Cleared ${count} completed tasks`, 'success');
            });
            
            // Bulk actions
            this.elements.bulkComplete.addEventListener('click', () => this.handleBulkComplete());
            this.elements.bulkDelete.addEventListener('click', () => this.handleBulkDelete());
            this.elements.bulkPriority.addEventListener('click', () => this.handleBulkPriority());
            
            // Import/Export
            this.elements.importBtn.addEventListener('click', () => this.elements.importFile.click());
            this.elements.exportBtn.addEventListener('click', () => this.handleExport());
            this.elements.importFile.addEventListener('change', (e) => this.handleImport(e));
            
            // Help
            this.elements.helpBtn.addEventListener('click', () => this.showModal('help'));
            
            // Modal handling
            this.elements.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.modalOverlay) {
                    this.hideModal();
                }
            });
            
            document.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => this.hideModal());
            });
            
            // Edit form
            this.elements.editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditSubmit();
            });
            
            document.getElementById('cancel-edit').addEventListener('click', () => this.hideModal());
        },

        /**
         * Setup keyboard shortcuts
         */
        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Don't handle shortcuts when typing in inputs
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    if (e.key === 'Escape') {
                        e.target.blur();
                        this.hideModal();
                    }
                    return;
                }
                
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        this.elements.addTaskInput.focus();
                        break;
                    case '/':
                        e.preventDefault();
                        this.elements.searchInput.focus();
                        break;
                    case 'a':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.selectAllVisible();
                        }
                        break;
                    case 'u':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            state.undo();
                        }
                        break;
                    case 'r':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            state.redo();
                        }
                        break;
                    case 'escape':
                        this.hideModal();
                        state.setState({ selectedTasks: new Set() });
                        break;
                    case 'delete':
                        if (state.state.selectedTasks.size > 0) {
                            this.handleBulkDelete();
                        }
                        break;
                    case 'x':
                        if (state.state.selectedTasks.size > 0) {
                            this.handleBulkComplete();
                        }
                        break;
                }
            });
        },

        /**
         * Setup drag and drop
         */
        setupDragAndDrop() {
            // We'll implement drag and drop in the task item event handlers
        },

        /**
         * Initialize theme
         */
        initTheme() {
            const savedTheme = state.state.theme || 'auto';
            this.applyTheme(savedTheme);
        },

        /**
         * Toggle theme
         */
        toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            let newTheme;
            
            if (currentTheme === 'dark') {
                newTheme = 'light';
            } else if (currentTheme === 'light') {
                newTheme = 'auto';
            } else {
                newTheme = 'dark';
            }
            
            this.applyTheme(newTheme);
            state.setState({ theme: newTheme });
        },

        /**
         * Apply theme
         */
        applyTheme(theme) {
            if (theme === 'auto') {
                document.documentElement.removeAttribute('data-theme');
            } else {
                document.documentElement.setAttribute('data-theme', theme);
            }
        },

        /**
         * Handle add task
         */
        handleAddTask() {
            const title = this.elements.addTaskInput.value.trim();
            if (!title) return;
            
            const dueDate = this.elements.dueDateInput.value;
            const priority = this.elements.prioritySelect.value;
            const tagsText = this.elements.tagsInput.value.trim();
            const tags = tagsText ? tagsText.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
            
            // Check for natural language due dates in the title
            const naturalDate = Utils.parseNaturalDate(title);
            const finalDueDate = dueDate || (naturalDate ? naturalDate.toISOString().slice(0, 16) : null);
            
            const task = state.addTask({
                title,
                dueAt: finalDueDate,
                priority,
                tags
            });
            
            // Clear form
            this.elements.addTaskForm.reset();
            this.elements.addTaskInput.focus();
            
            this.showToast('Task added successfully', 'success');
        },

        /**
         * Set active filter
         */
        setActiveFilter(filter) {
            this.elements.filterTabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.filter === filter);
                tab.setAttribute('aria-selected', tab.dataset.filter === filter);
            });
            
            state.setState({ currentFilter: filter });
        },

        /**
         * Render the application
         */
        render(appState) {
            // Hide loading, show app
            if (appState.isLoading) {
                this.elements.loading.style.display = 'flex';
                this.elements.app.style.display = 'none';
                return;
            } else {
                this.elements.loading.style.display = 'none';
                this.elements.app.style.display = 'flex';
            }
            
            // Update UI elements
            this.updateTaskList(appState.filteredTasks);
            this.updateTaskCount(appState);
            this.updateClearCompleted(appState.tasks);
            this.updateBulkActions(appState.selectedTasks);
            this.updateActiveFilters(appState.activeTagFilters);
            this.updateEmptyState(appState.filteredTasks);
            
            // Update form states
            this.elements.searchInput.value = appState.searchQuery;
            this.elements.sortSelect.value = appState.currentSort;
            
            // Update filter tabs
            this.setActiveFilter(appState.currentFilter);
        },

        /**
         * Update task list
         */
        updateTaskList(tasks) {
            this.elements.taskList.innerHTML = '';
            // Use DocumentFragment to batch DOM updates for performance
            const fragment = document.createDocumentFragment();
            for (let i = 0; i < tasks.length; i++) {
                const taskElement = this.createTaskElement(tasks[i]);
                fragment.appendChild(taskElement);
            }
            this.elements.taskList.appendChild(fragment);
        },

        /**
         * Create task element
         */
        createTaskElement(task) {
            const taskItem = document.createElement('div');
            taskItem.className = 'task-item';
            taskItem.dataset.taskId = task.id;
            
            // Add classes for state
            if (task.completed) taskItem.classList.add('completed');
            if (state.state.selectedTasks.has(task.id)) taskItem.classList.add('selected');
            
            // Add due date classes
            const dueDateClass = Utils.getDueDateClass(task.dueAt);
            if (dueDateClass) taskItem.classList.add(dueDateClass);
            
            // Build task content
            const dueDateStr = task.dueAt ? Utils.formatDate(task.dueAt) : '';
            const tagsHtml = task.tags && task.tags.length > 0 
                ? `<div class="task-tags">${task.tags.map(tag => 
                    `<span class="task-tag" data-tag="${Utils.sanitizeHtml(tag)}">${Utils.sanitizeHtml(tag)}</span>`
                  ).join('')}</div>`
                : '';
            
            const priorityHtml = task.priority 
                ? `<div class="task-priority ${task.priority}">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                       <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" stroke-width="2"/>
                     </svg>
                     ${TASK_PRIORITIES[task.priority].label}
                   </div>`
                : '';
            
            const dueDateHtml = dueDateStr 
                ? `<div class="task-due ${dueDateClass}">
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                       <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                       <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2"/>
                     </svg>
                     ${dueDateStr}
                   </div>`
                : '';
            
            taskItem.innerHTML = `
                <div class="drag-handle" draggable="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 3h1v18H9zm5 0h1v18h-1z" fill="currentColor"/>
                    </svg>
                </div>
                
                <div class="task-checkbox ${task.completed ? 'checked' : ''}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                
                <div class="task-content">
                    <div class="task-title">${Utils.sanitizeHtml(task.title)}</div>
                    ${task.notes ? `<div class="task-notes">${Utils.sanitizeHtml(task.notes)}</div>` : ''}
                    <div class="task-meta">
                        ${tagsHtml}
                        ${priorityHtml}
                        ${dueDateHtml}
                    </div>
                </div>
                
                <div class="task-actions">
                    <button class="task-action-btn edit-task" aria-label="Edit task">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="2"/>
                            <path d="m18.5 2.5-5 5L16 10l5-5a2.121 2.121 0 0 0-3-3z" fill="currentColor"/>
                        </svg>
                    </button>
                    <button class="task-action-btn delete-task" aria-label="Delete task">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" stroke="currentColor" stroke-width="2"/>
                        </svg>
                    </button>
                </div>
            `;
            
            // Bind events
            this.bindTaskEvents(taskItem, task);
            
            return taskItem;
        },

        /**
         * Bind task item events
         */
        bindTaskEvents(taskItem, task) {
            const checkbox = taskItem.querySelector('.task-checkbox');
            const editBtn = taskItem.querySelector('.edit-task');
            const deleteBtn = taskItem.querySelector('.delete-task');
            const dragHandle = taskItem.querySelector('.drag-handle');
            const tags = taskItem.querySelectorAll('.task-tag');
            
            // Checkbox toggle
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                state.toggleTaskComplete(task.id);
            });
            
            // Task selection
            taskItem.addEventListener('click', (e) => {
                if (e.target.closest('.task-checkbox') || e.target.closest('.task-action-btn') || e.target.closest('.task-tag')) {
                    return;
                }
                
                const newSelected = new Set(state.state.selectedTasks);
                
                if (e.ctrlKey || e.metaKey) {
                    // Toggle selection
                    if (newSelected.has(task.id)) {
                        newSelected.delete(task.id);
                    } else {
                        newSelected.add(task.id);
                    }
                } else if (e.shiftKey && newSelected.size > 0) {
                    // Range selection
                    const allTasks = state.state.filteredTasks;
                    const currentIndex = allTasks.findIndex(t => t.id === task.id);
                    const selectedTasks = Array.from(newSelected);
                    const lastSelectedIndex = allTasks.findIndex(t => t.id === selectedTasks[selectedTasks.length - 1]);
                    
                    const start = Math.min(currentIndex, lastSelectedIndex);
                    const end = Math.max(currentIndex, lastSelectedIndex);
                    
                    for (let i = start; i <= end; i++) {
                        newSelected.add(allTasks[i].id);
                    }
                } else {
                    // Single selection
                    newSelected.clear();
                    newSelected.add(task.id);
                }
                
                state.setState({ selectedTasks: newSelected });
            });
            
            // Double-click to edit
            taskItem.addEventListener('dblclick', () => {
                this.showEditModal(task);
            });
            
            // Edit button
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEditModal(task);
            });
            
            // Delete button
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this task?')) {
                    state.deleteTask(task.id);
                    this.showToast('Task deleted', 'info');
                }
            });
            
            // Tag filters
            tags.forEach(tagElement => {
                tagElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tag = e.target.dataset.tag;
                    this.addTagFilter(tag);
                });
            });
            
            // Drag and drop
            this.setupTaskDragAndDrop(taskItem, task);
        },

        /**
         * Setup drag and drop for task item
         */
        setupTaskDragAndDrop(taskItem, task) {
            const dragHandle = taskItem.querySelector('.drag-handle');
            
            dragHandle.addEventListener('dragstart', (e) => {
                this.dragState.draggedElement = taskItem;
                this.dragState.draggedTask = task;
                taskItem.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', taskItem.outerHTML);
            });
            
            taskItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                
                if (this.dragState.draggedElement && this.dragState.draggedElement !== taskItem) {
                    const rect = taskItem.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                        taskItem.style.borderTop = '2px solid var(--accent-color)';
                        taskItem.style.borderBottom = '';
                    } else {
                        taskItem.style.borderBottom = '2px solid var(--accent-color)';
                        taskItem.style.borderTop = '';
                    }
                }
            });
            
            taskItem.addEventListener('dragleave', () => {
                taskItem.style.borderTop = '';
                taskItem.style.borderBottom = '';
            });
            
            taskItem.addEventListener('drop', (e) => {
                e.preventDefault();
                taskItem.style.borderTop = '';
                taskItem.style.borderBottom = '';
                
                if (this.dragState.draggedTask && this.dragState.draggedTask.id !== task.id) {
                    this.reorderTasks(this.dragState.draggedTask, task, e);
                }
            });
            
            taskItem.addEventListener('dragend', () => {
                taskItem.classList.remove('dragging');
                taskItem.style.borderTop = '';
                taskItem.style.borderBottom = '';
                this.dragState.draggedElement = null;
                this.dragState.draggedTask = null;
            });
        },

        /**
         * Reorder tasks via drag and drop
         */
        reorderTasks(draggedTask, targetTask, event) {
            const rect = event.currentTarget.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const insertAfter = event.clientY > midY;
            
            const allTasks = [...state.state.tasks];
            const draggedIndex = allTasks.findIndex(t => t.id === draggedTask.id);
            const targetIndex = allTasks.findIndex(t => t.id === targetTask.id);
            
            // Remove dragged task
            const [removed] = allTasks.splice(draggedIndex, 1);
            
            // Insert at new position
            const newIndex = insertAfter ? targetIndex : targetIndex;
            allTasks.splice(newIndex, 0, removed);
            
            // Update order values
            allTasks.forEach((task, index) => {
                task.order = index;
                task.updatedAt = new Date().toISOString();
            });
            
            state.setState({ tasks: allTasks });
            this.showToast('Task reordered', 'info');
        },

        /**
         * Show edit modal
         */
        showEditModal(task) {
            state.setState({ editingTask: task });
            
            // Populate form
            document.getElementById('edit-title').value = task.title;
            document.getElementById('edit-notes').value = task.notes || '';
            document.getElementById('edit-due-date').value = task.dueAt ? task.dueAt.slice(0, 16) : '';
            document.getElementById('edit-priority').value = task.priority || '';
            document.getElementById('edit-tags').value = task.tags ? task.tags.join(', ') : '';
            
            this.showModal('edit');
        },

        /**
         * Handle edit form submit
         */
        handleEditSubmit() {
            const task = state.state.editingTask;
            if (!task) return;
            
            const title = document.getElementById('edit-title').value.trim();
            if (!title) {
                this.showToast('Title is required', 'error');
                return;
            }
            
            const updates = {
                title,
                notes: document.getElementById('edit-notes').value.trim(),
                dueAt: document.getElementById('edit-due-date').value || null,
                priority: document.getElementById('edit-priority').value,
                tags: document.getElementById('edit-tags').value
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag)
            };
            
            state.updateTask(task.id, updates);
            this.hideModal();
            this.showToast('Task updated', 'success');
        },

        /**
         * Show modal
         */
        showModal(type) {
            this.elements.modalOverlay.style.display = 'block';
            
            // Hide all modals
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
            
            // Show specific modal
            const modal = type === 'edit' ? this.elements.editModal : this.elements.helpModal;
            modal.style.display = 'block';
            
            // Focus first input
            if (type === 'edit') {
                setTimeout(() => document.getElementById('edit-title').focus(), 100);
            }
        },

        /**
         * Hide modal
         */
        hideModal() {
            this.elements.modalOverlay.style.display = 'none';
            state.setState({ editingTask: null });
        },

        /**
         * Handle bulk operations
         */
        handleBulkComplete() {
            const selectedIds = Array.from(state.state.selectedTasks);
            if (selectedIds.length === 0) return;
            
            state.bulkComplete(selectedIds);
            state.setState({ selectedTasks: new Set() });
            this.showToast(`Completed ${selectedIds.length} tasks`, 'success');
        },

        handleBulkDelete() {
            const selectedIds = Array.from(state.state.selectedTasks);
            if (selectedIds.length === 0) return;
            
            if (confirm(`Delete ${selectedIds.length} selected tasks?`)) {
                state.bulkDelete(selectedIds);
                state.setState({ selectedTasks: new Set() });
                this.showToast(`Deleted ${selectedIds.length} tasks`, 'info');
            }
        },

        handleBulkPriority() {
            const selectedIds = Array.from(state.state.selectedTasks);
            if (selectedIds.length === 0) return;
            
            const priority = prompt('Enter priority (high, medium, low, or leave empty for none):');
            if (priority !== null) {
                const validPriority = ['high', 'medium', 'low', ''].includes(priority.toLowerCase()) 
                    ? priority.toLowerCase() 
                    : '';
                state.bulkSetPriority(selectedIds, validPriority);
                state.setState({ selectedTasks: new Set() });
                this.showToast(`Set priority for ${selectedIds.length} tasks`, 'success');
            }
        },

        /**
         * Select all visible tasks
         */
        selectAllVisible() {
            const visibleIds = new Set(state.state.filteredTasks.map(task => task.id));
            state.setState({ selectedTasks: visibleIds });
        },

        /**
         * Add tag filter
         */
        addTagFilter(tag) {
            const currentFilters = [...state.state.activeTagFilters];
            if (!currentFilters.includes(tag)) {
                currentFilters.push(tag);
                state.setState({ activeTagFilters: currentFilters });
            }
        },

        /**
         * Remove tag filter
         */
        removeTagFilter(tag) {
            const currentFilters = state.state.activeTagFilters.filter(t => t !== tag);
            state.setState({ activeTagFilters: currentFilters });
        },

        /**
         * Update UI elements
         */
        updateTaskCount(appState) {
            const activeCount = appState.tasks.filter(task => !task.completed).length;
            const totalCount = appState.tasks.length;
            
            this.elements.taskCount.textContent = 
                `${activeCount} of ${totalCount} tasks remaining`;
        },

        updateClearCompleted(tasks) {
            const completedCount = tasks.filter(task => task.completed).length;
            this.elements.clearCompleted.style.display = completedCount > 0 ? 'block' : 'none';
        },

        updateBulkActions(selectedTasks) {
            this.elements.bulkActions.style.display = selectedTasks.size > 0 ? 'flex' : 'none';
        },

        updateActiveFilters(activeTagFilters) {
            this.elements.activeFilters.innerHTML = '';
            
            activeTagFilters.forEach(tag => {
                const chip = document.createElement('div');
                chip.className = 'filter-chip';
                chip.innerHTML = `
                    <span>${Utils.sanitizeHtml(tag)}</span>
                    <button class="filter-chip-remove" data-tag="${Utils.sanitizeHtml(tag)}" aria-label="Remove filter">×</button>
                `;
                
                chip.querySelector('.filter-chip-remove').addEventListener('click', () => {
                    this.removeTagFilter(tag);
                });
                
                this.elements.activeFilters.appendChild(chip);
            });
        },

        updateEmptyState(filteredTasks) {
            this.elements.emptyState.style.display = filteredTasks.length === 0 ? 'flex' : 'none';
            this.elements.taskList.style.display = filteredTasks.length === 0 ? 'none' : 'flex';
        },

        /**
         * Import/Export functionality
         */
        async handleExport() {
            try {
                const data = await Storage.exportData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `todo-app-export-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                this.showToast('Tasks exported successfully', 'success');
            } catch (error) {
                console.error('Export failed:', error);
                this.showToast('Export failed', 'error');
            }
        },

        async handleImport(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                
                const mergedData = await Storage.importData(data);
                
                // Update state with merged data
                state.setState({
                    tasks: mergedData.tasks,
                    currentFilter: mergedData.currentFilter || 'all',
                    currentSort: mergedData.currentSort || 'created',
                    activeTagFilters: mergedData.activeTagFilters || [],
                    searchQuery: mergedData.searchQuery || ''
                });
                
                this.showToast('Tasks imported successfully', 'success');
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast('Import failed - invalid file format', 'error');
            }
            
            // Reset file input
            event.target.value = '';
        },

        /**
         * Show toast notification
         */
        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                ${Utils.sanitizeHtml(message)}
                <div class="toast-progress"></div>
            `;
            
            this.elements.toastContainer.appendChild(toast);
            
            // Auto remove after duration
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, APP_CONFIG.toastDuration);
            
            // Remove on click
            toast.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        }
    };

    // =============================================================================
    // Application Initialization
    // =============================================================================

    class TodoApp {
        constructor() {
            this.state = new StateManager();
            this.ui = UI;
        }

        async init() {
            try {
                // Initialize storage
                await Storage.init();
                
                // Initialize UI
                this.ui.init();
                
                // Subscribe to state changes
                this.state.subscribe((state) => {
                    this.ui.render(state);
                });
                
                // Load initial data
                await this.state.loadData();
                
                console.log('Todo App initialized successfully');
            } catch (error) {
                console.error('Failed to initialize app:', error);
                UI.showToast('Failed to initialize app', 'error');
            }
        }
    }

    // Create global state reference for UI access
    let state;

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    async function initApp() {
        const app = new TodoApp();
        state = app.state; // Make state globally accessible
        await app.init();
    }

    // Export for potential external use
    window.TodoApp = {
        state,
        UI,
        Storage,
        Utils
    };

})();