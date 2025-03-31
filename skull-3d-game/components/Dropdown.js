// Advanced Dropdown Component with Multi-select and Search
class Dropdown extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                display: inline-block;
                position: relative;
                width: 250px;
                font-family: inherit;
            }

            .dropdown {
                position: relative;
                width: 100%;
            }

            .trigger {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 6px;
                background: rgba(0, 255, 255, 0.1);
                color: #00ffff;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: 14px;
                transition: all 0.2s ease;
                user-select: none;
            }

            .trigger:hover {
                background: rgba(0, 255, 255, 0.2);
                border-color: rgba(0, 255, 255, 0.5);
            }

            .trigger:focus {
                outline: none;
                box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.2);
            }

            .trigger[aria-expanded="true"] {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }

            .arrow {
                margin-left: 8px;
                transition: transform 0.2s ease;
            }

            .trigger[aria-expanded="true"] .arrow {
                transform: rotate(180deg);
            }

            .menu {
                position: absolute;
                top: 100%;
                left: 0;
                width: 100%;
                max-height: 250px;
                overflow-y: auto;
                background: rgba(30, 30, 30, 0.95);
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-top: none;
                border-radius: 0 0 6px 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                opacity: 0;
                visibility: hidden;
                transform-origin: top;
                transform: scaleY(0.95);
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1000;
                backdrop-filter: blur(10px);
            }

            .menu.show {
                opacity: 1;
                visibility: visible;
                transform: scaleY(1);
            }

            .search {
                position: sticky;
                top: 0;
                padding: 8px;
                background: inherit;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .search input {
                width: 100%;
                padding: 6px 10px;
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.2);
                color: #fff;
                font-size: 13px;
            }

            .search input:focus {
                outline: none;
                border-color: rgba(0, 255, 255, 0.5);
                box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.2);
            }

            .option {
                padding: 8px 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #fff;
                transition: all 0.2s ease;
            }

            .option:hover {
                background: rgba(0, 255, 255, 0.1);
            }

            .option.selected {
                background: rgba(0, 255, 255, 0.2);
            }

            .option.focused {
                background: rgba(0, 255, 255, 0.15);
            }

            .checkbox {
                width: 16px;
                height: 16px;
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .option.selected .checkbox {
                background: rgba(0, 255, 255, 0.8);
                border-color: transparent;
            }

            .checkbox::after {
                content: '✓';
                color: #000;
                font-size: 12px;
                opacity: 0;
                transform: scale(0);
                transition: all 0.2s ease;
            }

            .option.selected .checkbox::after {
                opacity: 1;
                transform: scale(1);
            }

            .tags {
                display: flex;
                flex-wrap: wrap;
                gap: 4px;
                padding: 4px;
            }

            .tag {
                background: rgba(0, 255, 255, 0.2);
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 4px;
                padding: 2px 8px;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .tag-remove {
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }

            .tag-remove:hover {
                opacity: 1;
            }

            .placeholder {
                color: rgba(0, 255, 255, 0.5);
            }

            /* Scrollbar styling */
            .menu::-webkit-scrollbar {
                width: 8px;
            }

            .menu::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
            }

            .menu::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 255, 0.3);
                border-radius: 4px;
            }

            .menu::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 255, 0.5);
            }

            /* Empty state */
            .empty {
                padding: 12px;
                text-align: center;
                color: rgba(255, 255, 255, 0.5);
                font-style: italic;
            }
        `;

        const template = document.createElement('template');
        template.innerHTML = `
            <div class="dropdown">
                <div class="trigger" tabindex="0" role="combobox" aria-haspopup="listbox">
                    <div class="selected-text"></div>
                    <span class="arrow">▼</span>
                </div>
                <div class="menu" role="listbox">
                    <div class="search">
                        <input type="text" placeholder="Search..." aria-label="Search options">
                    </div>
                    <div class="options"></div>
                </div>
            </div>
        `;

        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(template.content.cloneNode(true));

        // Store references
        this.trigger = this.shadowRoot.querySelector('.trigger');
        this.menu = this.shadowRoot.querySelector('.menu');
        this.optionsContainer = this.shadowRoot.querySelector('.options');
        this.searchInput = this.shadowRoot.querySelector('.search input');
        this.selectedText = this.shadowRoot.querySelector('.selected-text');

        // Bind methods
        this._onTriggerClick = this._onTriggerClick.bind(this);
        this._onSearchInput = this._onSearchInput.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onClickOutside = this._onClickOutside.bind(this);

        // Initialize state
        this.options = [];
        this.selectedValues = new Set();
        this.focusedIndex = -1;

        // Add event listeners
        this.trigger.addEventListener('click', this._onTriggerClick);
        this.searchInput.addEventListener('input', this._onSearchInput);
        this.addEventListener('keydown', this._onKeyDown);
    }

    // Observed attributes
    static get observedAttributes() {
        return ['placeholder', 'multiple', 'searchable'];
    }

    // Lifecycle callbacks
    connectedCallback() {
        document.addEventListener('click', this._onClickOutside);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this._onClickOutside);
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'placeholder':
                this._updatePlaceholder();
                break;
            case 'multiple':
            case 'searchable':
                this._updateUI();
                break;
        }
    }

    // Private methods
    _onTriggerClick(event) {
        event.stopPropagation();
        this.toggleMenu();
    }

    _onSearchInput() {
        const searchTerm = this.searchInput.value.toLowerCase();
        this._filterOptions(searchTerm);
    }

    _onKeyDown(event) {
        if (!this.menu.classList.contains('show')) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggleMenu();
            }
            return;
        }

        switch (event.key) {
            case 'Escape':
                this.closeMenu();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this._focusNextOption();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this._focusPreviousOption();
                break;
            case 'Enter':
                event.preventDefault();
                this._selectFocusedOption();
                break;
        }
    }

    _onClickOutside(event) {
        if (!this.contains(event.target)) {
            this.closeMenu();
        }
    }

    _filterOptions(searchTerm) {
        const options = this.shadowRoot.querySelectorAll('.option');
        let hasVisibleOptions = false;

        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const isVisible = text.includes(searchTerm);
            option.style.display = isVisible ? '' : 'none';
            if (isVisible) hasVisibleOptions = true;
        });

        this._updateEmptyState(!hasVisibleOptions);
    }

    _updateEmptyState(isEmpty) {
        const existingEmpty = this.optionsContainer.querySelector('.empty');
        if (isEmpty && !existingEmpty) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = 'No options found';
            this.optionsContainer.appendChild(empty);
        } else if (!isEmpty && existingEmpty) {
            existingEmpty.remove();
        }
    }

    _focusNextOption() {
        const visibleOptions = Array.from(this.shadowRoot.querySelectorAll('.option'))
            .filter(opt => opt.style.display !== 'none');
        
        if (visibleOptions.length === 0) return;

        this.focusedIndex = Math.min(this.focusedIndex + 1, visibleOptions.length - 1);
        this._updateFocus();
        this._scrollToFocused();
    }

    _focusPreviousOption() {
        const visibleOptions = Array.from(this.shadowRoot.querySelectorAll('.option'))
            .filter(opt => opt.style.display !== 'none');
        
        if (visibleOptions.length === 0) return;

        this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
        this._updateFocus();
        this._scrollToFocused();
    }

    _updateFocus() {
        const options = this.shadowRoot.querySelectorAll('.option');
        options.forEach(opt => opt.classList.remove('focused'));

        const visibleOptions = Array.from(options).filter(opt => opt.style.display !== 'none');
        if (this.focusedIndex >= 0 && this.focusedIndex < visibleOptions.length) {
            visibleOptions[this.focusedIndex].classList.add('focused');
        }
    }

    _scrollToFocused() {
        const focused = this.shadowRoot.querySelector('.option.focused');
        if (focused) {
            focused.scrollIntoView({ block: 'nearest' });
        }
    }

    _selectFocusedOption() {
        const focused = this.shadowRoot.querySelector('.option.focused');
        if (focused) {
            const value = focused.getAttribute('data-value');
            this.toggleOption(value);
        }
    }

    _updateUI() {
        this.optionsContainer.innerHTML = '';
        
        this.options.forEach(option => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.setAttribute('data-value', option.value);
            optionEl.setAttribute('role', 'option');
            
            if (this.selectedValues.has(option.value)) {
                optionEl.classList.add('selected');
            }

            if (this.hasAttribute('multiple')) {
                const checkbox = document.createElement('div');
                checkbox.className = 'checkbox';
                optionEl.appendChild(checkbox);
            }

            const label = document.createElement('span');
            label.textContent = option.label;
            optionEl.appendChild(label);

            optionEl.addEventListener('click', () => this.toggleOption(option.value));
            this.optionsContainer.appendChild(optionEl);
        });

        this._updateSelectedText();
        this.searchInput.style.display = this.hasAttribute('searchable') ? '' : 'none';
    }

    _updateSelectedText() {
        if (this.selectedValues.size === 0) {
            this._updatePlaceholder();
            return;
        }

        if (this.hasAttribute('multiple')) {
            const tags = document.createElement('div');
            tags.className = 'tags';

            Array.from(this.selectedValues).forEach(value => {
                const option = this.options.find(opt => opt.value === value);
                if (!option) return;

                const tag = document.createElement('div');
                tag.className = 'tag';
                tag.textContent = option.label;

                const remove = document.createElement('span');
                remove.className = 'tag-remove';
                remove.textContent = '×';
                remove.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleOption(value);
                });

                tag.appendChild(remove);
                tags.appendChild(tag);
            });

            this.selectedText.innerHTML = '';
            this.selectedText.appendChild(tags);
        } else {
            const value = Array.from(this.selectedValues)[0];
            const option = this.options.find(opt => opt.value === value);
            this.selectedText.textContent = option ? option.label : '';
        }
    }

    _updatePlaceholder() {
        const placeholder = this.getAttribute('placeholder') || 'Select option';
        this.selectedText.innerHTML = `<span class="placeholder">${placeholder}</span>`;
    }

    // Public methods
    setOptions(options) {
        this.options = options;
        this._updateUI();
    }

    toggleOption(value) {
        if (this.hasAttribute('multiple')) {
            if (this.selectedValues.has(value)) {
                this.selectedValues.delete(value);
            } else {
                this.selectedValues.add(value);
            }
        } else {
            this.selectedValues.clear();
            this.selectedValues.add(value);
            this.closeMenu();
        }

        this._updateUI();
        this.dispatchEvent(new CustomEvent('change', {
            detail: {
                values: Array.from(this.selectedValues)
            }
        }));
    }

    toggleMenu() {
        if (this.menu.classList.contains('show')) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        this.menu.classList.add('show');
        this.trigger.setAttribute('aria-expanded', 'true');
        this.searchInput.value = '';
        this._filterOptions('');
        this.focusedIndex = -1;
        this._updateFocus();

        if (this.hasAttribute('searchable')) {
            this.searchInput.focus();
        }
    }

    closeMenu() {
        this.menu.classList.remove('show');
        this.trigger.setAttribute('aria-expanded', 'false');
        this.trigger.focus();
    }

    getValue() {
        return this.hasAttribute('multiple') 
            ? Array.from(this.selectedValues)
            : Array.from(this.selectedValues)[0] || null;
    }

    setValue(values) {
        this.selectedValues.clear();
        if (Array.isArray(values)) {
            values.forEach(value => this.selectedValues.add(value));
        } else if (values != null) {
            this.selectedValues.add(values);
        }
        this._updateUI();
    }
}

customElements.define('game-dropdown', Dropdown);

export default Dropdown; 