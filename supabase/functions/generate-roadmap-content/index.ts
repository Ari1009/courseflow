
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
    const { courseTitle, category, contentType } = await req.json()
    
    if (!courseTitle || !category || !contentType) {
      throw new Error('Missing required fields: courseTitle, category, and contentType are required')
    }
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY environment variable is not configured')
    }

    console.log('Generating', contentType, 'for course:', courseTitle, 'in category:', category)
    
    let systemPrompt, userPrompt

    if (contentType === 'projects') {
      systemPrompt = `You are an expert project designer who creates engaging, hands-on learning projects. You MUST respond ONLY with valid JSON - no markdown, no explanations, no extra text.

CRITICAL JSON STRUCTURE (respond with ONLY this):
{
  "projects": [
    {
      "title": "Project Title Here",
      "difficulty": "Beginner|Intermediate|Advanced",
      "duration": "1-2 weeks",
      "description": "Detailed project description explaining what the learner will build",
      "tasks": [
        "Specific actionable task 1",
        "Specific actionable task 2",
        "Specific actionable task 3",
        "Specific actionable task 4",
        "Specific actionable task 5",
        "Specific actionable task 6"
      ]
    }
  ]
}`

      userPrompt = `Generate 3 hands-on projects for the course "${courseTitle}" in the ${category} domain.

Create:
1. One BEGINNER project (1-2 weeks duration)
2. One INTERMEDIATE project (2-3 weeks duration) 
3. One ADVANCED project (4-6 weeks duration)

For each project, provide:
- Creative and engaging title
- Clear description explaining what the learner will build
- 6 specific, actionable tasks
- Realistic duration estimate
- Difficulty level (Beginner/Intermediate/Advanced)

Make projects:
- Practical and applicable to real-world scenarios
- Progressive in complexity
- Directly related to "${courseTitle}" content
- Portfolio-worthy upon completion
- Engaging for learners at their skill level

Return ONLY the JSON object with no additional text or formatting.`
    
    } else if (contentType === 'opportunities') {
      systemPrompt = `You are a career advisor who creates real-world opportunities for learners. You MUST respond ONLY with valid JSON - no markdown, no explanations, no extra text.

CRITICAL JSON STRUCTURE (respond with ONLY this):
{
  "opportunities": [
    {
      "title": "Opportunity Title Here",
      "type": "Job|Freelance|Internship|Contract|Fellowship",
      "company": "Company Name",
      "location": "Location",
      "salary": "$X-Y/hour or $X,XXX/month",
      "description": "Detailed description of the opportunity",
      "requirements": [
        "Requirement 1",
        "Requirement 2", 
        "Requirement 3",
        "Requirement 4"
      ],
      "website": "https://example.com"
    }
  ]
}`

      userPrompt = `Generate 3 real-world opportunities for someone who has completed the course "${courseTitle}" in the ${category} domain.

Create opportunities that include:
1. One entry-level position (Job/Internship)
2. One freelance/contract opportunity
3. One growth opportunity (Fellowship/Advanced role)

For each opportunity, provide:
- Realistic job title
- Company or platform name
- Location (mix of remote and on-site)
- Competitive salary range
- Clear description of responsibilities
- 4 realistic requirements
- Valid website URL (use real platforms like LinkedIn, Upwork, etc.)

Make opportunities:
- Realistic and achievable for course graduates
- Varied in type and location
- Directly applicable to "${courseTitle}" skills
- Current market relevant
- Inspiring for career growth

Return ONLY the JSON object with no additional text or formatting.`
    }

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
        temperature: 0.1,
        max_tokens: 4000,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      console.error('Groq API error:', errorText)
      throw new Error(`Groq API error: ${groqResponse.status}`)
    }

    const groqData = await groqResponse.json()
    console.log('Groq API response received successfully')
    
    let generatedContent
    try {
      const rawContent = groqData.choices[0].message.content.trim()
      console.log('Raw content preview:', rawContent.substring(0, 500))
      
      // Clean JSON content
      let cleanedContent = rawContent
      
      // Remove markdown code blocks
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      }
      if (cleanedContent.startsWith('```')) {
        cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      // Find JSON boundaries
      const jsonStart = cleanedContent.indexOf('{')
      if (jsonStart > 0) {
        cleanedContent = cleanedContent.substring(jsonStart)
      }
      
      const jsonEnd = cleanedContent.lastIndexOf('}')
      if (jsonEnd > 0 && jsonEnd < cleanedContent.length - 1) {
        cleanedContent = cleanedContent.substring(0, jsonEnd + 1)
      }
      
      // Clean special characters
      cleanedContent = cleanedContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u2013|\u2014/g, "-")
      
      generatedContent = JSON.parse(cleanedContent)
      console.log('JSON parsed successfully')
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      
      // Fallback content
      if (contentType === 'projects') {
        generatedContent = {
          projects: [
            {
              title: `${courseTitle} Foundation Project`,
              difficulty: "Beginner",
              duration: "1-2 weeks",
              description: `Build a fundamental project that demonstrates core concepts from ${courseTitle}`,
              tasks: [
                `Set up project structure for ${courseTitle}`,
                `Implement basic functionality`,
                `Add user interface components`,
                `Test core features`,
                `Document your learning process`,
                `Create project presentation`
              ]
            }
          ]
        }
      } else {
        generatedContent = {
          opportunities: [
            {
              title: `${courseTitle} Specialist`,
              type: "Freelance",
              company: "Various Clients",
              location: "Remote",
              salary: "$25-50/hour",
              description: `Apply your ${courseTitle} skills to help clients solve problems`,
              requirements: [
                `Proficiency in ${courseTitle}`,
                "Strong communication skills",
                "Problem-solving abilities",
                "Portfolio of relevant work"
              ],
              website: "https://www.upwork.com"
            }
          ]
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, content: generatedContent }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in generate-roadmap-content function:', error)
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
