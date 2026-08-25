export const RASA_API_URL = "http://127.0.0.1:5005/webhooks/rest/webhook";

// Send message to Rasa and get the response
export async function sendMessageToRasa(message: string, language?: string, sessionId?: string, category?: string | null) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: message, language, sessionId, activeCategory: category, category }),
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    
    const answerParts = Array.isArray(data.answer)
      ? data.answer.filter((part: unknown): part is string => typeof part === "string" && part.trim().length > 0)
      : typeof data.answer === "string" && data.answer.trim()
        ? [data.answer]
        : [];

    const richPayload = {
      mapData: data.mapDataList || data.mapData,
      follow_up: data.follow_up || [],
      imageUrls: data.imageUrls,
      suggestions: data.suggestions || [],
      choiceGroups: data.choiceGroups || []
    };

    if (answerParts.length > 0) {
      return answerParts.map((text: string, index: number) => {
        const isLast = index === answerParts.length - 1;
        return {
          text,
          image: isLast ? data.imageUrl : undefined,
          custom: isLast ? richPayload : {}
        };
      });
    }

    return [{
      text: data.imageUrl || data.mapData || data.mapDataList ? "" : "No response received.",
      image: data.imageUrl,
      custom: richPayload
    }];
  } catch (error) {
    console.error("Error sending message:", error);
    return [{ text: "Sorry, the chatbot is unavailable right now." }];
  }
}
