// Dynamic Interaction Service
import { ApiClient } from './api-client.js';

export class InteractionService {
    static async fetchPendingInteractions(sessionId = null) {
        const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
        return await ApiClient.getJson(`/api/v1/interactions/pending${query}`);
    }

    static async submitResponse(interactionId, { selectedOptionIds = [], customResponse = null, formValues = null, idempotencyKey = null }) {
        return await ApiClient.postJson(`/api/v1/interactions/${encodeURIComponent(interactionId)}/respond`, {
            selected_option_ids: selectedOptionIds,
            custom_response: customResponse,
            form_values: formValues,
            idempotency_key: idempotencyKey
        });
    }

    static async fetchCapabilities() {
        return await ApiClient.getJson('/api/v1/interactions/capabilities');
    }
}
