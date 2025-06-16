
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
    const { userAnswer, question, correctAnswer, options } = await req.json()
    
    if (!userAnswer || !question || !correctAnswer) {
      throw new Error('Missing required fields: userAnswer, question, and correctAnswer are required')
    }
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY environment variable is not configured')
    }

    console.log('Validating answer:', { userAnswer, question, correctAnswer })
    
    const systemPrompt = `You are a quiz answer validator. Your job is to determine if a user's answer is correct for a given question.

Rules:
1. Compare the user's answer with the correct answer
2. Consider semantic equivalence, not just exact text matching
3. Account for different phrasings that mean the same thing
4. Be case-insensitive
5. Consider partial matches if they demonstrate understanding
6. Return ONLY "true" or "false" - no explanations

Examples:
- User: "JavaScript", Correct: "javascript" → true
- User: "Machine Learning", Correct: "ML" → true  
- User: "HTTP", Correct: "HyperText Transfer Protocol" → true
- User: "completely wrong answer", Correct: "right answer" → false`

    const userPrompt = `Question: "${question}"
Available options: ${options ? options.join(', ') : 'N/A'}
User's answer: "${userAnswer}"
Correct answer: "${correctAnswer}"

Is the user's answer correct? Respond with only "true" or "false".`

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
        max_tokens: 10,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error:', errorText)
      throw new Error(`Groq API error: ${groqResponse.status}`)
    }

    const groqData = await groqResponse.json()
    const validationResult = groqData.choices[0].message.content.trim().toLowerCase()
    
    const isCorrect = validationResult === 'true'
    
    console.log('Validation result:', { 
      userAnswer, 
      correctAnswer, 
      validationResult, 
      isCorrect 
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        isCorrect,
        userAnswer,
        correctAnswer
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in validate-quiz-answer function:', error)
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
