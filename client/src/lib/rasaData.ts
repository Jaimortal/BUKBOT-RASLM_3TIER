export const RASA_API_URL = "http://127.0.0.1:5005/webhooks/rest/webhook";

// Send message to Rasa and get the response
export async function sendMessageToRasa(message: string, language?: string, sessionId?: string) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: message, language, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data = await response.json();
    
    return [{ 
      text: data.answer || "No response received.",
      image: data.imageUrl,
      custom: {
        mapData: data.mapData,
        follow_up: data.follow_up || [],
        imageUrls: data.imageUrls,
        suggestions: data.suggestions || [],
        choiceGroups: data.choiceGroups || []
      }
    }];
  } catch (error) {
    console.error("Error sending message:", error);
    return [{ text: "Sorry, the chatbot is unavailable right now." }];
  }
}
