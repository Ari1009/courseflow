
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
    const requestBody = await req.json()
    console.log('Received adaptive feedback request:', requestBody)
    
    const { 
      progress_id,
      course_id,
      module_id,
      quiz_score,
      confidence_level,
      struggle_topics,
      understanding_topics,
      reflection_notes
    } = requestBody
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not set')
      throw new Error('GROQ_API_KEY environment variable is not configured')
    }

    console.log('Generating adaptive feedback...')
    
    // Calculate score percentage
    const scorePercentage = Math.round((quiz_score / 10) * 100)
    
    // Using Groq for adaptive feedback generation
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
            content: `You are an AI learning coach that provides personalized feedback and adaptive learning recommendations. You MUST respond ONLY with valid JSON - no markdown, no explanations, no extra text.

Return ONLY this JSON structure:

{
  "weaknesses": ["weakness1", "weakness2"],
  "recommended_resources": [
    {
      "title": "Resource Title",
      "url": "https://example.com",
      "type": "Video Tutorial"
    }
  ],
  "should_advance": true,
  "review_topics": ["topic1", "topic2"],
  "motivational_message": "Encouraging message here",
  "next_focus_areas": ["area1", "area2"]
}

CRITICAL RULES:
1. Respond with ONLY the JSON object - no other text
2. Base recommendations on the user's performance data
3. Be encouraging but honest about areas needing improvement
4. Provide 1-3 specific recommended resources with real URLs when possible
5. should_advance should be true if score >= 70% and confidence >= 6
6. Include 2-4 next focus areas based on struggle topics
7. Make motivational message personal and specific to their performance`
          },
          {
            role: 'user',
            content: `Generate adaptive feedback for a student with this performance data:

Quiz Score: ${quiz_score}/10 (${scorePercentage}%)
Confidence Level: ${confidence_level}/10
Topics Struggled With: ${struggle_topics.join(', ') || 'None specified'}
Topics Understood Well: ${understanding_topics.join(', ') || 'None specified'}
Reflection Notes: ${reflection_notes || 'No reflection provided'}

Based on this data:
- Identify key weaknesses from struggle topics and low quiz performance
- Recommend 1-2 relevant learning resources with real URLs
- Determine if they should advance (score >= 70% AND confidence >= 6)
- Suggest specific topics to review if needed
- Generate an encouraging but realistic motivational message
- Identify 2-3 focus areas for next week

Return ONLY the JSON object with no extra text.`
          }
        ],
        temperature: 0.3,
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
    
    let feedbackContent
    try {
      const rawContent = groqData.choices[0].message.content.trim()
      console.log('Raw feedback content preview:', rawContent.substring(0, 200))
      
      // Clean any potential markdown formatting
      let cleanedContent = rawContent
      
      // Remove markdown code blocks
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Remove any text before the first {
      const jsonStart = cleanedContent.indexOf('{')
      if (jsonStart > 0) {
        cleanedContent = cleanedContent.substring(jsonStart)
      }
      
      // Remove any text after the last }
      const jsonEnd = cleanedContent.lastIndexOf('}')
      if (jsonEnd > 0 && jsonEnd < cleanedContent.length - 1) {
        cleanedContent = cleanedContent.substring(0, jsonEnd + 1)
      }
      
      feedbackContent = JSON.parse(cleanedContent)
      console.log('Feedback JSON parsed successfully')
      
      // Validate the structure
      if (!feedbackContent.motivational_message) {
        throw new Error('Invalid feedback structure: missing motivational_message')
      }
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Raw content that failed to parse:', groqData.choices[0].message.content)
      
      // Fallback feedback if parsing fails
      feedbackContent = {
        weaknesses: struggle_topics.slice(0, 3),
        recommended_resources: [
          {
            title: "Review Core Concepts",
            url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(struggle_topics[0] || 'study tips'),
            type: "Video Tutorial"
          }
        ],
        should_advance: scorePercentage >= 70 && confidence_level >= 6,
        review_topics: struggle_topics.slice(0, 2),
        motivational_message: scorePercentage >= 80 
          ? "Great job! You're making excellent progress." 
          : scorePercentage >= 60 
            ? "Good work! Keep practicing to strengthen your understanding."
            : "Don't worry, learning takes time. Focus on the basics and you'll improve!",
        next_focus_areas: struggle_topics.length > 0 ? struggle_topics.slice(0, 3) : ["Review fundamentals", "Practice exercises"]
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        feedback: feedbackContent 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in generate-adaptive-feedback function:', error)
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
