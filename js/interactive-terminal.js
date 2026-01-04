// Interactive Terminal for Hugo Shell Theme
// Adds command-based navigation to the terminal interface

(function() {
    'use strict';

    // Terminal state
    let navData = {};
    let commandHistory = [];
    let historyIndex = -1;

    // Initialize terminal
    async function initTerminal() {
        try {
            // Fetch navigation structure
            const response = await fetch('/data/terminal-nav.json');
            if (!response.ok) {
                console.error('Failed to load terminal navigation data');
                return;
            }
            navData = await response.json();

            // Wait for the typewriter animation to complete
            await waitForAnimation();

            // Add interactive prompt
            addInteractivePrompt();
        } catch (error) {
            console.error('Error initializing terminal:', error);
        }
    }

    // Wait for typewriter animation to complete
    function waitForAnimation() {
        return new Promise((resolve) => {
            // Check if the last prompt (ps1_04) has been populated
            const checkInterval = setInterval(() => {
                const lastPrompt = document.getElementById('ps1_04');
                if (lastPrompt && lastPrompt.innerHTML && lastPrompt.innerHTML.length > 0) {
                    clearInterval(checkInterval);
                    // Wait a bit more to ensure everything is rendered
                    setTimeout(resolve, 300);
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }

    // Command handlers
    const commands = {
        help: showHelp,
        ls: listSections,
        cd: navigateToSection,
        clear: clearTerminal
    };

    // Handle command input
    function handleCommand(input) {
        const trimmed = input.trim();
        if (!trimmed) {
            addInteractivePrompt();
            return;
        }

        // Add to history
        commandHistory.push(trimmed);
        historyIndex = commandHistory.length;

        // Parse command
        const [cmd, ...args] = trimmed.split(' ');

        // Execute
        if (commands[cmd]) {
            commands[cmd](args);
        } else {
            showError(`Command not found: ${cmd}. Type 'help' for available commands.`);
            addInteractivePrompt();
        }
    }

    // Navigate to section
    function navigateToSection(args) {
        if (!args || args.length === 0) {
            showError("Usage: cd <section>. Type 'ls' to see available sections.");
            addInteractivePrompt();
            return;
        }

        const section = args[0].toLowerCase();
        const url = navData.navigation[section];

        if (url) {
            appendOutput(`Navigating to ${section}...`);
            // Small delay for user feedback
            setTimeout(() => {
                window.location.href = url;
            }, 300);
        } else {
            showError(`Section not found: ${section}. Type 'ls' to see available sections.`);
            addInteractivePrompt();
        }
    }

    // List sections
    function listSections() {
        if (!navData.sections || navData.sections.length === 0) {
            showError("No sections available.");
            addInteractivePrompt();
            return;
        }

        let output = 'Available sections:\n\n';
        navData.sections.forEach(s => {
            output += `  ${s.name.padEnd(15)} - ${s.description}\n`;
        });
        output += '\nType \'cd <section>\' to navigate.';

        appendOutput(output);
        addInteractivePrompt();
    }

    // Show help
    function showHelp() {
        let output = 'Available commands:\n\n';

        for (const [cmd, info] of Object.entries(navData.commands)) {
            output += `  ${cmd.padEnd(10)} - ${info.description}\n`;
            output += `             Usage: ${info.usage}\n\n`;
        }

        appendOutput(output);
        addInteractivePrompt();
    }

    // Clear terminal
    function clearTerminal() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = '';
        }
        addInteractivePrompt();
    }

    // Input handling
    function setupInputHandlers(input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const command = input.value;

                // Display the command in the terminal
                const promptLine = input.closest('.prompt-line');
                if (promptLine) {
                    const displaySpan = document.createElement('span');
                    displaySpan.className = 'user-input';
                    displaySpan.textContent = command;
                    promptLine.querySelector('input').replaceWith(displaySpan);
                }

                handleCommand(command);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateHistory(-1, input);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateHistory(1, input);
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // Tab autocomplete could be added here
            }
        });

        // Keep focus on input
        input.focus();

        // Prevent losing focus
        document.addEventListener('click', () => {
            if (input && !input.disabled) {
                input.focus();
            }
        });
    }

    // Navigate command history
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

    // DOM manipulation helpers
    function addInteractivePrompt() {
        const content = document.getElementById('content');
        if (!content) return;

        const promptDiv = createPromptElement();
        content.appendChild(promptDiv);

        const input = promptDiv.querySelector('input');
        if (input) {
            setupInputHandlers(input);
            input.focus();
        }

        // Scroll to bottom
        window.scrollTo(0, document.body.scrollHeight);
    }

    function createPromptElement() {
        const container = document.createElement('div');
        container.className = 'prompt-line';

        // Get prompt info from existing elements
        const userSpan = document.querySelector('#user');
        const userName = userSpan ? userSpan.textContent : 'user';

        // Extract pc name from the existing prompt
        const ps1Element = document.getElementById('ps1_04');
        let pcName = 'host';
        if (ps1Element) {
            const match = ps1Element.innerHTML.match(/@([^:]+):/);
            if (match) pcName = match[1];
        }

        container.innerHTML = `
            <br>
            <strong>
                <span style="color: var(--base0B)">${userName}</span>
                <span style="color: var(--base07)">@</span>
                <span style="color: var(--base0B)">${pcName}</span>
                <span style="color: var(--base07)">:</span>
                <span style="color: var(--base0D)">~</span>
            </strong>
            <span style="color: var(--base07)">$ </span>
            <input type="text" id="terminal-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        `;

        return container;
    }

    function appendOutput(text) {
        const content = document.getElementById('content');
        if (!content) return;

        const output = document.createElement('div');
        output.style.whiteSpace = 'pre-wrap';
        output.style.fontFamily = 'inherit';
        output.textContent = text;

        content.appendChild(output);
        window.scrollTo(0, document.body.scrollHeight);
    }

    function showError(message) {
        const content = document.getElementById('content');
        if (!content) return;

        const error = document.createElement('div');
        error.style.color = 'var(--base08, #ff5555)';
        error.style.whiteSpace = 'pre-wrap';
        error.textContent = message;

        content.appendChild(error);
        window.scrollTo(0, document.body.scrollHeight);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTerminal);
    } else {
        initTerminal();
    }
})();
