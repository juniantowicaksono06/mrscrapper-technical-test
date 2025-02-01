import Groq from 'groq-sdk';
import { type ChatCompletionCreateParams } from 'groq-sdk/resources/chat/completions';

export const extractData = async(text: string) => {
    const client = new Groq({
        apiKey: process.env.GROQ_API_KEY
    });

    
    const params: ChatCompletionCreateParams = {
        messages: [
        { role: 'system', content: `When receiving text content, convert it into JSON as per the function 
                specifications provided by the user. Avoid assumptions about data extraction or JSON structure and you have to answer only with JSON. 
                Ensure the conversion process accurately reflects the user-defined output format.` },
        { role: 'user', content: `Extract the following data in JSON format and respond only with valid JSON . Ensure the output adheres to these rules:
            If a field is missing or empty, replace its value with "-".
            Translate the product_description into English if it is not already in English.
            {
                "product_name": "Product Name",
                "product_price": "Product Price",
                "product_description": "The description of the product"
            }  
            Here are the text:
            ${text}` },
        ],
        model: 'deepseek-r1-distill-llama-70b',
    };
    const chatCompletion: Groq.Chat.ChatCompletion = await client.chat.completions.create(params);
    return chatCompletion.choices[0].message.content;
}