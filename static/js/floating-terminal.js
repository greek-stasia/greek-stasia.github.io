// Floating Persistent Terminal
(function() {
    'use strict';

    console.log('[FloatingTerminal] Initializing...');

    let navData = {};
    let commandHistory = JSON.parse(sessionStorage.getItem('terminalHistory') || '[]');
    let historyIndex = commandHistory.length;
    let currentInput = null;
    let isMinimized = false;

    // Command handlers
    const commands = {
        help: showHelp,
        ls: listSections,
        cd: navigateToSection,
        clear: clearTerminal,
        history: showHistory,
        home: () => navigateToSection(['about'])
    };

    // Initialize floating terminal
    async function init() {
        try {
            // Fetch navigation data
            const response = await fetch('/data/terminal-nav.json');
            if (response.ok) {
                navData = await response.json();
            }

            // Create floating terminal UI
            createFloatingTerminal();

            // Setup keyboard shortcuts
            setupKeyboardShortcuts();

            // Show hint on first visit
            showInitialHint();

            console.log('[FloatingTerminal] Ready!');
        } catch (error) {
            console.error('[FloatingTerminal] Init error:', error);
        }
    }

    function createFloatingTerminal() {
        // Create toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'terminal-toggle';
        toggleBtn.innerHTML = '$';
        toggleBtn.title = 'Open Terminal (Ctrl+`)';
        toggleBtn.onclick = toggleTerminal;

        // Create hint
        const hint = document.createElement('div');
        hint.className = 'terminal-hint';
        hint.textContent = 'Press Ctrl+` to open terminal';

        // Create floating terminal
        const terminal = document.createElement('div');
        terminal.id = 'floating-terminal';
        terminal.innerHTML = `
            <div class="terminal-resizer"></div>
            <div class="terminal-header">
                <span class="terminal-title">stayge@staygelabs:~$</span>
                <div class="terminal-controls">
                    <button class="terminal-btn minimize" title="Minimize"></button>
                    <button class="terminal-btn maximize" title="Maximize"></button>
                    <button class="terminal-btn close" title="Close"></button>
                </div>
            </div>
            <div class="terminal-content" id="floating-content">
                <span id="terminal">╔═══════════════════════════════════════════════════════════╗</span><br>
                <span id="terminal">║           Welcome to StaygeLabs Terminal                 ║</span><br>
                <span id="terminal">╚═══════════════════════════════════════════════════════════╝</span><br>
                <br>
                <span id="terminal">This terminal is persistent across all pages!</span><br>
                <br>
                <span id="terminal" style="color: #23e298">Getting Started:</span><br>
                <span id="terminal">  • Type 'help' to see all available commands</span><br>
                <span id="terminal">  • Type 'ls' to list sections you can visit</span><br>
                <span id="terminal">  • Type 'cd blog' to navigate to the blog</span><br>
                <span id="terminal">  • Type 'clear' to clear the terminal screen</span><br>
                <br>
                <span id="terminal" style="color: #d08010">Terminal Controls:</span><br>
                <span id="terminal">  • Press Ctrl+\` to open/close terminal</span><br>
                <span id="terminal">  • Press Escape to close terminal</span><br>
                <span id="terminal">  • Use ↑/↓ arrow keys for command history</span><br>
                <span id="terminal">  • Drag top edge to resize terminal</span><br>
                <span id="terminal">  • Click window controls: 🟡 minimize  🟢 maximize  🔴 close</span><br>
                <br>
                <span id="terminal" style="color: #f92672">Pro Tip:</span><br>
                <span id="terminal">  Your command history persists as you navigate pages!</span><br>
                <span id="terminal">  Try 'cd blog' then 'cd about' - the terminal stays with you.</span><br>
                <br>
            </div>
        `;

        document.body.appendChild(toggleBtn);
        document.body.appendChild(hint);
        document.body.appendChild(terminal);

        // Setup controls
        terminal.querySelector('.minimize').onclick = minimizeTerminal;
        terminal.querySelector('.maximize').onclick = maximizeTerminal;
        terminal.querySelector('.close').onclick = closeTerminal;

        // Setup resizer
        setupResizer(terminal.querySelector('.terminal-resizer'), terminal);

        // Add initial prompt
        addPrompt();
    }

    function toggleTerminal() {
        const terminal = document.getElementById('floating-terminal');
        const toggleBtn = document.getElementById('terminal-toggle');
        const isOpen = terminal.classList.contains('open');

        if (isOpen) {
            closeTerminal();
        } else {
            terminal.classList.add('open');
            terminal.classList.remove('minimized');
            toggleBtn.classList.add('hidden');
            isMinimized = false;
            focusInput();
        }
    }

    function minimizeTerminal() {
        const terminal = document.getElementById('floating-terminal');
        isMinimized = !isMinimized;
        terminal.classList.toggle('minimized');
    }

    function maximizeTerminal() {
        const terminal = document.getElementById('floating-terminal');
        if (terminal.style.height === '90vh') {
            terminal.style.height = '50vh';
        } else {
            terminal.style.height = '90vh';
        }
    }

    function closeTerminal() {
        const terminal = document.getElementById('floating-terminal');
        const toggleBtn = document.getElementById('terminal-toggle');
        terminal.classList.remove('open');
        toggleBtn.classList.remove('hidden');
    }

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+` to toggle terminal
            if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                toggleTerminal();
            }
            // Escape to close terminal
            if (e.key === 'Escape') {
                const terminal = document.getElementById('floating-terminal');
                if (terminal.classList.contains('open')) {
                    closeTerminal();
                }
            }
        });
    }

    function setupResizer(resizer, terminal) {
        let startY, startHeight;

        resizer.addEventListener('mousedown', (e) => {
            startY = e.clientY;
            startHeight = parseInt(window.getComputedStyle(terminal).height);
            document.addEventListener('mousemove', resize);
            document.addEventListener('mouseup', stopResize);
        });

        function resize(e) {
            const delta = startY - e.clientY;
            const newHeight = startHeight + delta;
            if (newHeight > 100 && newHeight < window.innerHeight - 50) {
                terminal.style.height = newHeight + 'px';
            }
        }

        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    function addPrompt() {
        const content = document.getElementById('floating-content');
        const promptLine = document.createElement('div');
        promptLine.className = 'prompt-line';
        promptLine.innerHTML = `
            <strong>
                <span style="color: #23e298">stayge</span>
                <span style="color: #bbbbbb">@</span>
                <span style="color: #23e298">staygelabs</span>
                <span style="color: #bbbbbb">:</span>
                <span style="color: #d08010">~</span>
            </strong>
            <span style="color: #bbbbbb">$ </span>
            <input type="text" id="terminal-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        `;

        content.appendChild(promptLine);
        currentInput = promptLine.querySelector('input');
        setupInputHandlers(currentInput);
        focusInput();
        scrollToBottom();
    }

    function setupInputHandlers(input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = input.value;
                executeCommand(command);
                input.value = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateHistory(-1, input);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateHistory(1, input);
            }
        });
    }

    function executeCommand(cmd) {
        const trimmed = cmd.trim();

        // Replace input with static text
        const promptLine = currentInput.closest('.prompt-line');
        if (promptLine) {
            const displaySpan = document.createElement('span');
            displaySpan.style.color = '#bbbbbb';
            displaySpan.textContent = trimmed;
            currentInput.replaceWith(displaySpan);
        }

        if (!trimmed) {
            addPrompt();
            return;
        }

        // Add to history
        commandHistory.push(trimmed);
        sessionStorage.setItem('terminalHistory', JSON.stringify(commandHistory));
        historyIndex = commandHistory.length;

        // Parse and execute
        const [cmdName, ...args] = trimmed.split(' ');

        if (commands[cmdName]) {
            commands[cmdName](args);
        } else {
            showError(`Command not found: ${cmdName}. Type 'help' for available commands.`);
            addPrompt();
        }
    }

    function navigateHistory(direction, input) {
        if (commandHistory.length === 0) return;

        historyIndex += direction;

        if (historyIndex < 0) {
            historyIndex = 0;
        } else if (historyIndex >= commandHistory.length) {
            historyIndex = commandHistory.length;
            input.value = '';
            return;
        }

        input.value = commandHistory[historyIndex] || '';
    }

    function appendOutput(text) {
        const content = document.getElementById('floating-content');
        const output = document.createElement('span');
        output.id = 'terminal';
        output.style.display = 'block';
        output.style.whiteSpace = 'pre-wrap';
        output.textContent = text;
        content.appendChild(output);
        content.appendChild(document.createElement('br'));
        scrollToBottom();
    }

    function showError(message) {
        const content = document.getElementById('floating-content');
        const error = document.createElement('span');
        error.id = 'terminal';
        error.style.display = 'block';
        error.style.color = '#f92672';
        error.textContent = message;
        content.appendChild(error);
        content.appendChild(document.createElement('br'));
        scrollToBottom();
    }

    function focusInput() {
        setTimeout(() => {
            if (currentInput) currentInput.focus();
        }, 100);
    }

    function scrollToBottom() {
        const content = document.getElementById('floating-content');
        if (content) {
            content.scrollTop = content.scrollHeight;
        }
    }

    function showInitialHint() {
        const hint = document.querySelector('.terminal-hint');
        const hasSeenHint = localStorage.getItem('terminalHintSeen');

        if (!hasSeenHint) {
            setTimeout(() => {
                hint.classList.add('show');
                setTimeout(() => {
                    hint.classList.remove('show');
                    localStorage.setItem('terminalHintSeen', 'true');
                }, 5000);
            }, 2000);
        }
    }

    // Command implementations
    function showHelp() {
        let output = 'Available commands:\n\n';
        for (const [cmd, info] of Object.entries(navData.commands || {})) {
            output += `  ${cmd.padEnd(10)} - ${info.description}\n`;
            output += `             Usage: ${info.usage}\n\n`;
        }
        output += `  history    - Show command history\n`;
        output += `  home       - Go to homepage\n`;
        appendOutput(output);
        addPrompt();
    }

    function listSections() {
        if (!navData.sections || navData.sections.length === 0) {
            showError("No sections available.");
            addPrompt();
            return;
        }

        let output = 'Available sections:\n\n';
        navData.sections.forEach(s => {
            output += `  ${s.name.padEnd(15)} - ${s.description}\n`;
        });
        output += '\nType \'cd <section>\' to navigate.';
        appendOutput(output);
        addPrompt();
    }

    function navigateToSection(args) {
        if (!args || args.length === 0) {
            showError("Usage: cd <section>. Type 'ls' to see available sections.");
            addPrompt();
            return;
        }

        const section = args[0].toLowerCase();
        const url = navData.navigation?.[section];

        if (url) {
            appendOutput(`Navigating to ${section}...`);
            setTimeout(() => {
                window.location.href = url;
            }, 300);
        } else {
            showError(`Section not found: ${section}. Type 'ls' to see available sections.`);
            addPrompt();
        }
    }

    function clearTerminal() {
        const content = document.getElementById('floating-content');
        content.innerHTML = '';
        addPrompt();
    }

    function showHistory() {
        if (commandHistory.length === 0) {
            appendOutput('No command history.');
        } else {
            let output = 'Command history:\n\n';
            commandHistory.forEach((cmd, i) => {
                output += `  ${(i + 1).toString().padStart(3)}  ${cmd}\n`;
            });
            appendOutput(output);
        }
        addPrompt();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
