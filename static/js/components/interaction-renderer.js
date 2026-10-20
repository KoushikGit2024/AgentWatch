// Dynamic Interaction Renderer Component
import { InteractionService } from '../services/interaction-service.js';

export class InteractionRenderer {
    constructor(containerElement, onResolved) {
        this.container = containerElement;
        this.onResolved = onResolved;
        this.selectedOptions = new Set();
        this.currentInteraction = null;
    }

    render(interaction) {
        this.currentInteraction = interaction;
        this.selectedOptions.clear();

        if (!interaction) {
            this.container.innerHTML = '';
            this.container.style.display = 'none';
            return;
        }

        this.container.style.display = 'block';
        const isMulti = interaction.kind === 'multiple_choice';
        const isSingle = interaction.kind === 'single_choice';
        const isForm = interaction.kind === 'form';
        const isConfirm = interaction.kind === 'confirmation';

        let html = `
            <div class="interaction-card">
                <div class="interaction-header">
                    <span class="interaction-badge">${interaction.kind.replace('_', ' ').toUpperCase()}</span>
                    <h3 class="interaction-title">${this.escape(interaction.title)}</h3>
                </div>
                ${interaction.description ? `<p class="interaction-desc">${this.escape(interaction.description)}</p>` : ''}
                
                <div class="interaction-body">
        `;

        // Render Options (Single/Multiple Choice)
        if (interaction.options && interaction.options.length > 0) {
            html += `<div class="interaction-options">`;
            interaction.options.forEach(opt => {
                const recBadge = opt.is_recommended ? `<span class="rec-badge">Recommended</span>` : '';
                html += `
                    <div class="interaction-option-pill" data-id="${this.escape(opt.id)}">
                        <div class="option-check">${isMulti ? '☐' : '○'}</div>
                        <div class="option-info">
                            <div class="option-label">${this.escape(opt.label)} ${recBadge}</div>
                            ${opt.description ? `<div class="option-sub">${this.escape(opt.description)}</div>` : ''}
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        // Render Custom "Other" Text Field if permitted
        if (interaction.allow_custom_response) {
            html += `
                <div class="custom-response-section">
                    <label class="custom-response-label">${this.escape(interaction.custom_response_label || 'Other Response')}:</label>
                    <input type="text" class="custom-response-input" id="customResponseInput" placeholder="Enter custom answer..." />
                </div>
            `;
        }

        // Action Buttons
        html += `
                </div>
                <div class="interaction-actions">
                    <button class="interaction-submit-btn" id="interactionSubmitBtn">
                        Submit Response
                    </button>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.bindEvents(interaction);
    }

    bindEvents(interaction) {
        const isMulti = interaction.kind === 'multiple_choice';
        const optionPills = this.container.querySelectorAll('.interaction-option-pill');

        optionPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const optId = pill.getAttribute('data-id');
                const checkEl = pill.querySelector('.option-check');

                if (isMulti) {
                    if (this.selectedOptions.has(optId)) {
                        this.selectedOptions.delete(optId);
                        pill.classList.remove('selected');
                        checkEl.textContent = '☐';
                    } else {
                        this.selectedOptions.add(optId);
                        pill.classList.add('selected');
                        checkEl.textContent = '☑';
                    }
                } else {
                    // Single choice
                    optionPills.forEach(p => {
                        p.classList.remove('selected');
                        p.querySelector('.option-check').textContent = '○';
                    });
                    this.selectedOptions.clear();
                    this.selectedOptions.add(optId);
                    pill.classList.add('selected');
                    checkEl.textContent = '●';
                }
            });
        });

        const submitBtn = this.container.querySelector('#interactionSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', async () => {
                const customInput = this.container.querySelector('#customResponseInput');
                const customText = customInput ? customInput.value.trim() : null;

                if (this.selectedOptions.size === 0 && !customText) {
                    alert('Please select an option or provide a response.');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.textContent = 'Submitting...';

                try {
                    const res = await InteractionService.submitResponse(interaction.interaction_id, {
                        selectedOptionIds: Array.from(this.selectedOptions),
                        customResponse: customText
                    });

                    if (res.success) {
                        this.container.innerHTML = `
                            <div class="interaction-success-card">
                                <span>✅ Response Submitted Successfully</span>
                            </div>
                        `;
                        setTimeout(() => {
                            this.container.style.display = 'none';
                            if (this.onResolved) this.onResolved(interaction.interaction_id);
                        }, 1200);
                    }
                } catch (e) {
                    alert(`Submission failed: ${e.message}`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Retry Submission';
                }
            });
        }
    }

    escape(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }
}
