
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
    console.log('Received lesson recommendation request:', requestBody)
    
    const { 
      courseTitle, 
      moduleTopics, 
      lessonTopics, 
      progress, 
      averageQuizScore, 
      requestedCount = 6 
    } = requestBody
    
    if (!courseTitle) {
      throw new Error('Course title is required for generating recommendations')
    }
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      console.log('GROQ_API_KEY not found, using fallback recommendations')
      return getFallbackRecommendations(courseTitle, averageQuizScore, requestedCount)
    }

    // Try AI recommendations with rate limit handling
    try {
      const aiRecommendations = await generateAIRecommendations(
        groqApiKey,
        courseTitle,
        moduleTopics,
        lessonTopics,
        progress,
        averageQuizScore,
        requestedCount
      )
      
      return new Response(
        JSON.stringify({ recommendations: aiRecommendations }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } catch (aiError) {
      console.log('AI generation failed, using enhanced fallback:', aiError.message)
      return getFallbackRecommendations(courseTitle, averageQuizScore, requestedCount)
    }

  } catch (error) {
    console.error('Error in generate-lesson-recommendations function:', error)
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

async function generateAIRecommendations(
  groqApiKey: string,
  courseTitle: string,
  moduleTopics: string[],
  lessonTopics: string[],
  progress: number,
  averageQuizScore: number,
  requestedCount: number
) {
  const performanceLevel = averageQuizScore < 6 ? 'beginner' : averageQuizScore > 8 ? 'advanced' : 'intermediate'

  const systemPrompt = `You are an expert educational content curator. Create ${requestedCount} lesson recommendations that represent ADVANCED concepts building on current learning.

CRITICAL: Respond with ONLY valid JSON - no markdown, explanations, or extra text.

JSON STRUCTURE:
{
  "recommendations": [
    {
      "id": "unique-id",
      "title": "Advanced Lesson Title",
      "description": "How this builds on current learning",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "XX min",
      "category": "Category Name",
      "relevanceScore": 0.9,
      "source": "ai-generated"
    }
  ]
}`

  const userPrompt = `Course: "${courseTitle}"
Progress: ${progress}%
Performance: ${performanceLevel} (${averageQuizScore}/10)
Topics: ${moduleTopics.join(', ')}
Recent Lessons: ${lessonTopics.slice(-3).join(', ')}

Generate ${requestedCount} ADVANCED lesson recommendations that build directly on these concepts.`

  console.log('Calling Groq API for lesson recommendations...')
  
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
      temperature: 0.3,
      max_tokens: 1500,
    }),
  })

  if (!groqResponse.ok) {
    const errorText = await groqResponse.text()
    console.error('Groq API error:', errorText)
    
    if (groqResponse.status === 429) {
      throw new Error('Rate limit exceeded - using fallback recommendations')
    }
    throw new Error(`Groq API error: ${groqResponse.status}`)
  }

  const groqData = await groqResponse.json()
  
  try {
    const rawContent = groqData.choices[0].message.content.trim()
    let cleanedContent = rawContent
    
    // Clean JSON response
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    }
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }
    
    const jsonStart = cleanedContent.indexOf('{')
    if (jsonStart > 0) {
      cleanedContent = cleanedContent.substring(jsonStart)
    }
    
    const jsonEnd = cleanedContent.lastIndexOf('}')
    if (jsonEnd > 0 && jsonEnd < cleanedContent.length - 1) {
      cleanedContent = cleanedContent.substring(0, jsonEnd + 1)
    }
    
    const recommendationsData = JSON.parse(cleanedContent)
    
    if (!recommendationsData.recommendations || !Array.isArray(recommendationsData.recommendations)) {
      throw new Error('Invalid recommendations structure')
    }
    
    // Ensure all recommendations have required fields
    return recommendationsData.recommendations.map((rec: any, index: number) => ({
      id: rec.id || `ai-rec-${Date.now()}-${index}`,
      title: rec.title || `Advanced ${courseTitle} Concepts`,
      description: rec.description || `Advanced concepts building on your ${courseTitle} learning`,
      difficulty: rec.difficulty || 'Intermediate',
      estimatedTime: rec.estimatedTime || '45 min',
      category: rec.category || 'Advanced Study',
      relevanceScore: Math.min(Math.max(rec.relevanceScore || 0.8, 0.7), 1.0),
      source: 'ai-generated'
    }))
    
  } catch (parseError) {
    console.error('JSON parsing error:', parseError)
    throw new Error('Failed to parse AI response')
  }
}

function getFallbackRecommendations(courseTitle: string, averageQuizScore: number, requestedCount: number) {
  console.log('Generating fallback recommendations for:', courseTitle)
  
  const category = analyzeCourseCategory(courseTitle)
  const performanceLevel = averageQuizScore < 6 ? 'beginner' : averageQuizScore > 8 ? 'advanced' : 'intermediate'
  
  const templates = getLessonTemplatesForCategory(category)
  
  const recommendations = templates.slice(0, requestedCount).map((template, index) => {
    let relevanceScore = template.baseRelevance
    
    // Adjust based on performance
    if (performanceLevel === 'beginner') {
      if (template.difficulty === 'Beginner') relevanceScore += 0.2
      if (template.difficulty === 'Advanced') relevanceScore -= 0.3
    } else if (performanceLevel === 'advanced') {
      if (template.difficulty === 'Advanced') relevanceScore += 0.2
      if (template.difficulty === 'Beginner') relevanceScore -= 0.2
    }

    return {
      id: `fallback-${category}-${Date.now()}-${index}`,
      title: `${template.title} (Advanced ${courseTitle})`,
      description: template.description,
      difficulty: template.difficulty,
      estimatedTime: template.estimatedTime,
      category: template.category,
      relevanceScore,
      source: 'curated' as const
    }
  })

  return new Response(
    JSON.stringify({ recommendations }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

function analyzeCourseCategory(courseTitle: string) {
  const title = courseTitle.toLowerCase()
  
  if (title.includes('spanish') || title.includes('español')) return 'spanish'
  if (title.includes('react') || title.includes('javascript') || title.includes('web') || title.includes('next')) return 'webdev'
  if (title.includes('python') || title.includes('programming') || title.includes('algorithm')) return 'programming'
  if (title.includes('data') || title.includes('machine learning') || title.includes('ai')) return 'datascience'
  if (title.includes('design') || title.includes('ui') || title.includes('ux')) return 'design'
  
  return 'general'
}

function getLessonTemplatesForCategory(category: string) {
  const lessonTemplates = {
    spanish: [
      {
        title: "Advanced Spanish Conversation Techniques",
        description: "Master natural conversation flow and idiomatic expressions",
        difficulty: "Advanced",
        estimatedTime: "45 min",
        category: "Speaking",
        baseRelevance: 0.9
      },
      {
        title: "Spanish Grammar Deep Dive: Subjunctive Mood",
        description: "Understand and practice the complex subjunctive mood",
        difficulty: "Advanced",
        estimatedTime: "60 min",
        category: "Grammar",
        baseRelevance: 0.8
      },
      {
        title: "Spanish Cultural Context and Usage",
        description: "Learn cultural nuances behind language patterns",
        difficulty: "Intermediate",
        estimatedTime: "40 min",
        category: "Culture",
        baseRelevance: 0.75
      }
    ],
    webdev: [
      {
        title: "Advanced React Patterns and Performance",
        description: "Custom hooks, context patterns, and optimization techniques",
        difficulty: "Advanced",
        estimatedTime: "75 min",
        category: "Frontend",
        baseRelevance: 0.9
      },
      {
        title: "Modern JavaScript ES2024 Features",
        description: "Latest JavaScript features and advanced usage patterns",
        difficulty: "Advanced",
        estimatedTime: "50 min",
        category: "JavaScript",
        baseRelevance: 0.8
      },
      {
        title: "Web Performance and Optimization",
        description: "Core Web Vitals, advanced caching, and performance monitoring",
        difficulty: "Advanced",
        estimatedTime: "65 min",
        category: "Performance",
        baseRelevance: 0.85
      }
    ],
    programming: [
      {
        title: "Advanced Algorithm Design and Analysis",
        description: "Complex algorithms, time complexity optimization, and advanced data structures",
        difficulty: "Advanced",
        estimatedTime: "90 min",
        category: "Algorithms",
        baseRelevance: 0.9
      },
      {
        title: "System Design and Architecture",
        description: "Scalable systems, microservices, and distributed computing",
        difficulty: "Advanced",
        estimatedTime: "80 min",
        category: "System Design",
        baseRelevance: 0.85
      },
      {
        title: "Advanced Programming Patterns",
        description: "Design patterns, functional programming, and code architecture",
        difficulty: "Advanced",
        estimatedTime: "70 min",
        category: "Patterns",
        baseRelevance: 0.8
      }
    ],
    general: [
      {
        title: "Advanced Critical Thinking",
        description: "Complex problem-solving and analytical reasoning techniques",
        difficulty: "Advanced",
        estimatedTime: "50 min",
        category: "Thinking",
        baseRelevance: 0.8
      },
      {
        title: "Professional Communication Mastery",
        description: "Advanced presentation and leadership communication skills",
        difficulty: "Advanced",
        estimatedTime: "45 min",
        category: "Communication",
        baseRelevance: 0.7
      },
      {
        title: "Strategic Learning and Development",
        description: "Meta-learning techniques and advanced skill acquisition",
        difficulty: "Advanced",
        estimatedTime: "40 min",
        category: "Learning",
        baseRelevance: 0.75
      }
    ]
  }

  return lessonTemplates[category as keyof typeof lessonTemplates] || lessonTemplates.general
}
