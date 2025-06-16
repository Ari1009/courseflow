
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, context, courseId, userId, quizScores } = await req.json()
    console.log('Received AI tutor chat request:', { message, context, courseId, userId })
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not set')
      throw new Error('GROQ_API_KEY environment variable is not configured')
    }

    console.log('Sending request to Groq AI...')
    
    // Enhanced system prompt for AI tutor
    const systemPrompt = `You are an intelligent AI tutor and learning coach. You help students with their studies by:

1. Answering questions about course content
2. Providing study tips and learning strategies
3. Offering encouragement and motivation
4. Explaining complex concepts in simple terms
5. Suggesting practice exercises and resources
6. Helping with homework and assignments

Context about the student:
${context ? JSON.stringify(context, null, 2) : 'No specific context provided'}

Recent quiz performance:
${quizScores && quizScores.length > 0 ? JSON.stringify(quizScores, null, 2) : 'No quiz data available'}

Be helpful, encouraging, and educational. Adapt your teaching style to the student's level and needs. Use examples and analogies when helpful. Always aim to help the student understand concepts rather than just giving answers.`

    // Using Groq AI API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    console.log('Groq API response status:', groqResponse.status)

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error details:', errorText)
      throw new Error(`Groq API error: ${groqResponse.status} - ${errorText}`)
    }

    const groqData = await groqResponse.json()
    console.log('Groq API response received successfully')
    
    const aiResponse = groqData.choices[0].message.content

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in ai-tutor-chat function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
