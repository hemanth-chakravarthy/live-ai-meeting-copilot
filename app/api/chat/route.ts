import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, transcript, chatHistory } = await req.json();
    
    // Get API key from cookies
    const apiKey = req.cookies.get('groqApiKey')?.value;
    
    // Validate input
    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Empty query' } },
        { status: 400 }
      );
    }
    
    if (!apiKey) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'API key required' } },
        { status: 401 }
      );
    }
    
    // Format the transcript context
    const transcriptText = transcript && transcript.length > 0 
      ? transcript.map((t: any) => `[${t.timestamp}] ${t.text}`).join('\n')
      : "No transcript available yet.";
    
    const systemPrompt = `You are an expert AI meeting copilot assisting a user during a live meeting.
Your job is to answer the user's questions or expand on their talking points based entirely on the Live Transcript context.

Live Transcript:\n${transcriptText}

Instructions:
1. Answer concisely but provide deep, actionable insight.
2. If the user asks a question, answer it directly using context from the transcript.
3. If the user clicks a suggestion (which comes through as a query), expand on that suggestion with detailed reasoning based heavily on the transcript.
4. If there is no relevant information in the transcript to answer the question, logically deduce the answer or state that the topic hasn't been covered yet.`;

    // Map chat history so the model has continuity
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map((m: any) => ({ role: m.role, content: m.content })),
      { role: 'user', content: query }
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
      })
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('Groq API Error:', errorData);
      return NextResponse.json(
        { error: { code: 'GROQ_API_ERROR', message: 'Failed to generate chat response' } },
        { status: groqResponse.status }
      );
    }

    const completion = await groqResponse.json();
    const responseText = completion.choices[0].message.content;
    
    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Model error' } },
      { status: 500 }
    );
  }
}