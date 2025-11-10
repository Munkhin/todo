// calls agent.py -> response -> rendering for task view and schedule view

export default class ModelResponse {

    // agent.py api call wrapper
    static async call(text: string, userId: string, file?: any) {

        // use relative path since vercel rewrites are used
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                user_id: userId,
                file: file || null
            })
        });

        // error handling
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results;
    }

    // gets all of the text fields from model response, concatenates them into a single string
    // used for model response bubble in schedule view
    // other field extracting functions will be implemented natively
    static extractText(results: any[]): string {
        return results
            .filter(result => result && result.text)
            .map(result => result.text)
            .join(' ');
    }
}
