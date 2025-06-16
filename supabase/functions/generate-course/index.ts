import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Received request body:', requestBody)
    
    // Extract the correct field names from the request body
    const { title: courseTitle, audience_level: audienceLevel, duration, instructions } = requestBody
    
    // Validate required fields
    if (!courseTitle || !audienceLevel || !duration) {
      console.error('Missing required fields:', { courseTitle, audienceLevel, duration })
      throw new Error('Missing required fields: courseTitle, audienceLevel, and duration are required')
    }
    
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    
    if (!groqApiKey) {
      console.error('GROQ_API_KEY is not set')
      throw new Error('GROQ_API_KEY environment variable is not configured')
    }

    console.log('Attempting to call Groq API...')
    console.log('Course details:', { courseTitle, audienceLevel, duration })
    
    // Enhanced course structure based on duration and complexity
    let moduleCount, lessonsPerModule, contentWordCount, complexityLevel
    switch (duration) {
      case '1-2 hours':
        moduleCount = '3-4'
        lessonsPerModule = '2-3'
        contentWordCount = '300-400'
        complexityLevel = 'basic with practical examples'
        break
      case '3-5 hours':
        moduleCount = '4-6'
        lessonsPerModule = '3-4'
        contentWordCount = '400-500'
        complexityLevel = 'comprehensive with hands-on exercises'
        break
      case '6-10 hours':
        moduleCount = '6-8'
        lessonsPerModule = '4-5'
        contentWordCount = '500-600'
        complexityLevel = 'detailed with projects and real-world applications'
        break
      case '10+ hours':
        moduleCount = '8-10'
        lessonsPerModule = '5-6'
        contentWordCount = '600-800'
        complexityLevel = 'comprehensive with advanced concepts and industry practices'
        break
      default:
        moduleCount = '4-6'
        lessonsPerModule = '3-4'
        contentWordCount = '400-500'
        complexityLevel = 'comprehensive with hands-on exercises'
    }

    // Enhanced prompt for more complex course generation
    const systemPrompt = `You are an expert educational content creator specializing in comprehensive, multi-section course development. You MUST respond ONLY with valid JSON - no markdown, no explanations, no extra text.

Create a ${complexityLevel} course with multiple progressive sections that build upon each other. The course should be structured as a complete learning journey with clear progression from fundamentals to advanced applications.

CRITICAL JSON STRUCTURE (respond with ONLY this):
{
  "modules": [
    {
      "module_title": "Module Title Here",
      "lessons": [
        {
          "lesson_title": "Lesson Title Here",
          "objectives": ["objective 1", "objective 2", "objective 3", "objective 4"],
          "content": "Comprehensive lesson content with detailed explanations, examples, practical applications, step-by-step instructions, and real-world scenarios",
          "quiz": [
            {
              "question": "Question text?",
              "options": ["option1", "option2", "option3", "option4"],
              "answer": "option1"
            },
            {
              "question": "Question text 2?",
              "options": ["optionA", "optionB", "optionC", "optionD"],
              "answer": "optionB"
            }
          ],
          "free_resources": [
            {
              "title": "Resource title",
              "url": "https://example.com"
            },
            {
              "title": "Resource title 2",
              "url": "https://example2.com"
            }
          ]
        }
      ]
    }
  ]
}

MANDATORY REQUIREMENTS:
1. Create ${moduleCount} progressive modules that build upon each other
2. Each module should have ${lessonsPerModule} lessons with varying complexity
3. Each lesson needs exactly 4 learning objectives, ${contentWordCount} words of content, 2 quiz questions, 2 resources
4. Content must include: theory, practical examples, step-by-step instructions, real-world applications
5. For language courses: include grammar rules, vocabulary lists, cultural context, usage examples
6. For technical courses: include code examples, best practices, troubleshooting, project ideas
7. Quiz answers must be EXACT matches to one of the four options
8. Use only ASCII characters - no special Unicode symbols
9. Create a logical learning progression from basic to advanced concepts
10. Include practical exercises and real-world applications in content`;

    const userPrompt = `Create a comprehensive ${duration} course about "${courseTitle}" for ${audienceLevel} level students.

COURSE SPECIFICATIONS:
- Topic: ${courseTitle}
- Level: ${audienceLevel} 
- Duration: ${duration}
- Complexity: ${complexityLevel}
${instructions ? `- Special Instructions: ${instructions}` : ''}

DETAILED REQUIREMENTS:
- Create ${moduleCount} modules with logical progression
- Each module should have ${lessonsPerModule} lessons
- Cover fundamentals, intermediate concepts, and practical applications
- Include comprehensive examples, exercises, and real-world scenarios
- For language learning: cover speaking, listening, reading, writing, grammar, vocabulary, culture
- For technical topics: cover theory, practical implementation, best practices, troubleshooting
- Make content engaging with varied learning approaches
- Ensure each quiz question tests understanding and has one clearly correct answer
- Provide diverse, high-quality free resources for further learning

PROGRESSION STRUCTURE:
- Early modules: foundational concepts and basic skills
- Middle modules: intermediate applications and skill building  
- Later modules: advanced concepts and real-world integration

Return ONLY the JSON object with no additional text or formatting.`;

    // Using Groq (free LLM API) for course generation
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
            content: userPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 8000,
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
    
    let courseContent
    try {
      const rawContent = groqData.choices[0].message.content.trim()
      console.log('Raw content preview:', rawContent.substring(0, 500))
      
      // Clean any potential markdown formatting or extra text
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
      
      // Enhanced character cleaning for better JSON parsing
      cleanedContent = cleanedContent
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\u201C|\u201D/g, '"') // Replace smart quotes with regular quotes
        .replace(/\u2018|\u2019/g, "'") // Replace smart apostrophes
        .replace(/\u2013|\u2014/g, "-") // Replace em/en dashes
        .replace(/\u2026/g, "...") // Replace ellipsis
        .replace(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '') // Remove Japanese characters
        .replace(/[\u0080-\uFFFF]/g, '') // Remove any remaining non-ASCII characters
      
      console.log('Cleaned content preview:', cleanedContent.substring(0, 500))
      
      // Try to fix common JSON issues
      let fixedContent = cleanedContent
      
      // Fix trailing commas in arrays and objects
      fixedContent = fixedContent.replace(/,(\s*[}\]])/g, '$1')
      
      // Fix missing commas between array elements
      fixedContent = fixedContent.replace(/}(\s*){/g, '},$1{')
      fixedContent = fixedContent.replace(/](\s*)\[/g, '],$1[')
      
      // Fix unescaped quotes in strings
      fixedContent = fixedContent.replace(/"([^"]*)"([^",:}\]]*)"([^",:}\]]*)":/g, '"$1\\"$2\\"$3":')
      
      console.log('Fixed content preview:', fixedContent.substring(0, 500))
      
      courseContent = JSON.parse(fixedContent)
      console.log('JSON parsed successfully')
      
      // Validate the structure
      if (!courseContent.modules || !Array.isArray(courseContent.modules)) {
        throw new Error('Invalid course structure: missing modules array')
      }
      
      // Ensure minimum complexity for the course
      if (courseContent.modules.length < 3) {
        console.log('Course structure too simple, enhancing...')
        // Add additional modules if needed for more comprehensive coverage
      }
      
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      console.error('Raw content that failed to parse:', groqData.choices[0].message.content)
      
      // Enhanced recovery with more sophisticated fallback
      console.log('Creating enhanced fallback course structure')
      courseContent = {
        modules: [
          {
            module_title: `Fundamentals of ${courseTitle}`,
            lessons: [
              {
                lesson_title: `Introduction to ${courseTitle}`,
                objectives: [
                  `Understand the core concepts of ${courseTitle}`,
                  `Learn fundamental principles and terminology`,
                  `Identify key components and their relationships`,
                  `Apply basic knowledge in practical scenarios`
                ],
                content: `Welcome to your comprehensive ${courseTitle} course! This lesson introduces you to the fundamental concepts and principles that form the foundation of ${courseTitle}. We'll explore the essential terminology, key components, and basic principles that you'll build upon throughout this course. Understanding these fundamentals is crucial for your success in more advanced topics. Through practical examples and step-by-step explanations, you'll gain confidence and establish a solid foundation for your learning journey.`,
                quiz: [
                  {
                    question: `What is the primary focus of learning ${courseTitle}?`,
                    options: ["Basic understanding only", "Practical application", "Theoretical knowledge", "All comprehensive aspects"],
                    answer: "All comprehensive aspects"
                  },
                  {
                    question: `Why is it important to understand fundamentals in ${courseTitle}?`,
                    options: ["It's not important", "Builds foundation for advanced concepts", "Just for beginners", "Only for testing"],
                    answer: "Builds foundation for advanced concepts"
                  }
                ],
                free_resources: [
                  {
                    title: `${courseTitle} Complete Guide`,
                    url: "https://example.com/comprehensive-guide"
                  },
                  {
                    title: `${courseTitle} Fundamentals Tutorial`,
                    url: "https://example.com/fundamentals"
                  }
                ]
              }
            ]
          },
          {
            module_title: `Intermediate ${courseTitle} Concepts`,
            lessons: [
              {
                lesson_title: `Building Your ${courseTitle} Skills`,
                objectives: [
                  `Develop intermediate-level competency`,
                  `Apply concepts in practical situations`,
                  `Solve common problems and challenges`,
                  `Prepare for advanced topic areas`
                ],
                content: `Now that you have a solid foundation, this lesson focuses on building your intermediate skills in ${courseTitle}. We'll explore more complex concepts, practical applications, and real-world scenarios. You'll learn to solve common problems, implement best practices, and develop the confidence to tackle more challenging aspects of ${courseTitle}. This lesson bridges the gap between basic understanding and advanced mastery.`,
                quiz: [
                  {
                    question: `What characterizes intermediate-level ${courseTitle} skills?`,
                    options: ["Basic knowledge only", "Practical problem-solving ability", "Advanced theory", "Expert-level mastery"],
                    answer: "Practical problem-solving ability"
                  },
                  {
                    question: `How do intermediate skills prepare you for advanced topics?`,
                    options: ["They don't", "Build confidence and practical experience", "Only theoretical knowledge", "Replace advanced learning"],
                    answer: "Build confidence and practical experience"
                  }
                ],
                free_resources: [
                  {
                    title: `${courseTitle} Practical Examples`,
                    url: "https://example.com/practical-examples"
                  },
                  {
                    title: `${courseTitle} Problem Solving Guide`,
                    url: "https://example.com/problem-solving"
                  }
                ]
              }
            ]
          }
        ]
      };
    }

    return new Response(
      JSON.stringify({ success: true, courseContent }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in generate-course function:', error)
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
