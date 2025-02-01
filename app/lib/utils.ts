export function extractJSON(text: string) {
    const match = text.match(/```json\n(.*?)\n```/s);

    if (match) {
        try {
            const jsonStr = match[1]; // Extract JSON string
            const data = JSON.parse(jsonStr); // Convert to object
            return data;
        } catch (error) {
            console.error("Error parsing JSON:", error);
            return null;
        }
    } else {
        console.warn("No JSON Found!");
        return null
    }
}