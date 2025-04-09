import { sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import * as oai from './helpers/openaiGeneric.js';
import { chatCompletion } from './payloads/completions.js';
import { any } from './helpers/utils.js';
import config from './config.js';

/**
 * Prefill-Heavy Test for OpenAI Chat Completions
 * 
 * Purpose: Evaluate how the model handles large amounts of input context
 * with relatively shorter output generations. This tests the model's ability
 * to process and understand extensive context efficiently.
 * 
 * Pattern: Large context windows with multi-turn conversations and substantial
 * background information, but relatively concise queries.
 */

// Custom metrics
const prefillProcessingTime = new Trend('prefill_processing_time');
const tokenProcessingRate = new Trend('token_processing_rate'); // tokens/second
const failureRate = new Rate('failure_rate');
const contextSizeMetric = new Trend('context_size_chars');

// Long context templates that we'll use as the base for our prompts
const longContextTemplates = [
  // Template 1: Literature analysis with book summary
  {
    context: `
The novel "To Kill a Mockingbird" by Harper Lee, published in 1960, is set in the fictional town of Maycomb, Alabama, during the Great Depression. The story spans three years and is narrated by Jean Louise "Scout" Finch, who lives with her brother Jem and their widowed father Atticus, a lawyer. The novel's first part focuses on Scout and Jem's childhood and their fascination with their reclusive neighbor, Arthur "Boo" Radley. They, along with their friend Dill, spend summers creating stories about Boo and devising ways to make him come out of his house.

Atticus is appointed to defend Tom Robinson, a black man falsely accused of raping Mayella Ewell, a young white woman. Despite strong evidence of Tom's innocence, including the fact that Mayella's injuries were on the right side of her face while Tom's left arm is disabled from a childhood accident, the all-white jury convicts him. Tom later tries to escape from prison and is shot dead. Meanwhile, Mayella's father, Bob Ewell, feels humiliated by the trial proceedings and vows revenge against Atticus.

On Halloween night, as Scout and Jem walk home from a school pageant, Bob Ewell attacks them. During the struggle, Jem's arm is broken, but someone comes to their rescue, carrying Jem home. Scout realizes that their rescuer is Boo Radley. Sheriff Tate arrives and discovers that Bob Ewell has been killed in the fight. Although it seems that Boo killed Ewell while defending the children, the sheriff decides to report that Ewell fell on his own knife, sparing the shy Boo from unwanted publicity.

The novel explores themes of racial injustice, moral growth, the coexistence of good and evil, class, courage, compassion, and gender roles. It uses the perspective of a child to criticize the irrationality of adult attitudes toward race and class in the Deep South of the 1930s. The character of Atticus Finch has been used as a model of moral character and legal ethics.

The novel won the Pulitzer Prize and has become a classic of modern American literature. A 1962 film adaptation starring Gregory Peck as Atticus Finch received widespread acclaim. As of 2018, the book has been published in more than 40 languages, with over 40 million copies sold. In 2006, British librarians ranked it ahead of the Bible as a book "every adult should read before they die." It is commonly assigned reading in schools throughout the English-speaking world to educate students about tolerance and prejudice.

In 2015, Harper Lee published "Go Set a Watchman," which features the character Scout Finch as an adult. Though written before "To Kill a Mockingbird," it was marketed as a sequel. The book has generated controversy, as it portrays an older Atticus Finch as a racist, contradicting his depiction in "To Kill a Mockingbird."
    `,
    questions: [
      "What are the main themes explored in the novel?",
      "How does the character of Atticus Finch demonstrate moral courage?",
      "What is the significance of the novel's title?",
      "How does Scout's perspective as a child shape the narrative?"
    ]
  },
  
  // Template 2: Scientific research paper summary
  {
    context: `
# Quantum Machine Learning: Current Status and Future Prospects

## Abstract
This comprehensive review examines the emerging field of quantum machine learning, which sits at the intersection of quantum physics and artificial intelligence. We discuss recent theoretical developments, experimental implementations, potential advantages over classical approaches, and key challenges that must be overcome. Our analysis suggests that while quantum machine learning shows promise for specific problems, significant technical hurdles remain before practical quantum advantage can be demonstrated for mainstream machine learning applications.

## 1. Introduction
Machine learning has transformed numerous fields through its ability to identify patterns in complex data. Concurrently, quantum computing has advanced rapidly, with recent demonstrations of quantum processors exceeding 100 qubits. The integration of these disciplines—quantum machine learning (QML)—explores whether quantum resources can enhance machine learning capabilities.

Theoretical work suggests potential quantum advantages, including exponential speedups for certain linear algebra operations and improved sample complexity for specific learning tasks. However, the practical realization of these advantages faces significant challenges, including noise in current quantum devices, limitations of quantum memory, and difficulties in data encoding.

## 2. Theoretical Foundations
### 2.1 Quantum Linear Algebra
Many machine learning algorithms rely on linear algebra operations such as matrix inversion and singular value decomposition. Quantum algorithms like HHL (Harrow-Hassidim-Lloyd) theoretically offer exponential speedups for these operations under certain conditions. However, these speedups require quantum random access memory (QRAM) and are highly sensitive to the condition number of the matrices involved.

### 2.2 Quantum Neural Networks
Quantum neural networks (QNNs) utilize parameterized quantum circuits as trainable models. These models can potentially represent functions that classical neural networks cannot efficiently approximate. Theoretical work has explored various architectures, including continuous-variable QNNs, discrete-variable QNNs, and hybrid quantum-classical approaches.

### 2.3 Quantum Kernel Methods
Quantum kernel methods leverage quantum computers to compute kernel functions that may be classically intractable. These kernels can then be used within standard support vector machines or other kernel-based algorithms. Recent work has suggested that quantum kernels might offer advantages for specific data distributions aligned with the quantum feature space.

## 3. Experimental Implementations
### 3.1 Digital Quantum Implementations
Several QML algorithms have been implemented on superconducting and trapped-ion quantum processors. Notable examples include demonstrations of quantum support vector machines, variational quantum classifiers, and quantum generative adversarial networks. However, these implementations have been limited to small-scale problems due to hardware constraints.

### 3.2 Analog Quantum Implementations
Quantum annealers have been applied to training restricted Boltzmann machines and solving optimization problems related to machine learning. While these systems can handle larger problem sizes compared to gate-based quantum computers, they are restricted to specific problem formulations.

### A selection of experimental implementations:
- 4-qubit variational quantum classifier (IBM Q)
- 20-qubit quantum generative adversarial network (Rigetti)
- 53-qubit quantum reinforcement learning (Google Sycamore)
- 2000-qubit quantum annealing for unsupervised learning (D-Wave)

## 4. Potential Advantages
### 4.1 Computational Complexity
Theoretical work has established that certain QML algorithms offer provable speedups over the best-known classical algorithms for specific problems. These include quantum principal component analysis, quantum recommendation systems, and quantum support vector machines.

### 4.2 Sample Complexity
Some QML approaches may require fewer training examples than classical methods to achieve comparable performance. This potential advantage is particularly relevant for domains where data acquisition is expensive or limited.

### 4.3 Expressivity
Quantum models may represent functions that require exponentially large classical networks. This expressivity advantage could be particularly relevant for modeling quantum mechanical systems and certain highly entangled datasets.

## 5. Challenges and Limitations
### 5.1 The Input Problem
A significant challenge for practical QML is efficiently encoding classical data into quantum states. Current approaches often require resources that negate potential quantum advantages.

### 5.2 The Output Problem
Similarly, extracting useful information from quantum states typically requires multiple measurements, potentially offsetting computational gains.

### 5.3 Noise and Decoherence
Current quantum processors suffer from noise and decoherence, limiting the depth of circuits that can be reliably executed. While error mitigation techniques show promise, fault-tolerant quantum computing may be necessary for realizing many theoretical QML advantages.

### 5.4 Barren Plateaus
Training variational quantum circuits faces the challenge of "barren plateaus," where the gradient of the cost function becomes exponentially small as the system size increases. This phenomenon makes training increasingly difficult for larger quantum neural networks.
    `,
    questions: [
      "What are the main theoretical advantages of quantum machine learning?",
      "What challenges must be overcome before quantum machine learning can demonstrate practical advantages?",
      "How do quantum neural networks differ from classical neural networks?",
      "What experimental implementations of quantum machine learning have been demonstrated so far?"
    ]
  },
  
  // Template 3: Legal case analysis
  {
    context: `
# Supreme Court of the United States
Brown v. Board of Education, 347 U.S. 483 (1954)

## Facts of the Case
This case consolidated five separate cases from Kansas, South Carolina, Virginia, Delaware, and Washington, D.C. The plaintiffs were African American children seeking admission to public schools that required or permitted segregation based on race. In each case, they had been denied admission to schools attended by white children under laws requiring or permitting segregation according to race. The plaintiffs alleged that segregation violated the Equal Protection Clause of the Fourteenth Amendment.

In the Kansas case, the district court found that segregation in public education had a detrimental effect on African American children but denied relief on the grounds that the segregated schools were substantially equal with respect to buildings, transportation, curricula, and educational qualifications of teachers. The plaintiffs appealed directly to the Supreme Court.

## Procedural History
The District Courts in the Kansas, South Carolina, Virginia, and Delaware cases ruled in favor of the school boards based on the "separate but equal" doctrine established in Plessy v. Ferguson (1896). The Delaware court ordered that the African American students be admitted to the white schools because of their superior quality, but still upheld the validity of the "separate but equal" doctrine. All cases were appealed to the U.S. Supreme Court and consolidated for argument.

The Supreme Court first heard arguments on December 9, 1952. The case was reargued on December 8, 1953, with the Court requesting that both sides discuss the circumstances surrounding the adoption of the Fourteenth Amendment and whether the framers intended it to abolish segregation in public education.

## Issues
1. Does segregation of children in public schools solely on the basis of race, even though the physical facilities and other "tangible" factors may be equal, deprive the minority group children of equal educational opportunities?
2. Should the Court's holding in Plessy v. Ferguson be reversed?

## Arguments
### Plaintiffs (Brown)
- The "separate but equal" doctrine adopted in Plessy v. Ferguson was wrong and should be overruled
- Segregation of public education violates the Equal Protection Clause of the Fourteenth Amendment
- Segregation generates a feeling of inferiority in minority children that may affect their hearts and minds in ways unlikely to be undone
- Modern psychological knowledge confirmed the detrimental effects of segregation
- Equal protection requires that all citizens be treated alike, without distinction based on race

### Defendants (Board of Education)
- The "separate but equal" doctrine has been consistently upheld by the Court and relied upon by states for decades
- The original understanding of the Fourteenth Amendment did not include desegregation of schools
- Education is traditionally a state and local matter, and federal courts should not intervene
- The facilities, curriculum, qualifications of teachers, and other tangible factors were equal between the segregated schools
- Existing precedent allowed "separate but equal" facilities

## Decision
In a unanimous 9-0 decision delivered by Chief Justice Earl Warren, the Supreme Court ruled that "separate educational facilities are inherently unequal" and violate the Equal Protection Clause of the Fourteenth Amendment.

The Court overturned the "separate but equal" doctrine from Plessy v. Ferguson as it applied to public education, finding that segregation has a detrimental effect on minority children. The Court relied in part on social science research demonstrating the psychological harm caused by segregation.

The Court held: "We conclude that in the field of public education the doctrine of 'separate but equal' has no place. Separate educational facilities are inherently unequal. Therefore, we hold that the plaintiffs and others similarly situated...are, by reason of the segregation complained of, deprived of the equal protection of the laws guaranteed by the Fourteenth Amendment."

## Reasoning
The Court's reasoning focused on the importance of education in modern American society and the psychological impact of segregation:

1. Education is perhaps the most important function of state and local governments and is the foundation of good citizenship.
2. The opportunity of education, where the state has undertaken to provide it, is a right which must be made available to all on equal terms.
3. Segregation of children in public schools solely on the basis of race generates a feeling of inferiority as to their status in the community.
4. This sense of inferiority affects the motivation of a child to learn and has a tendency to retard educational and mental development.
5. The Court cited various psychological studies, including work by Kenneth Clark, which showed that segregation had a detrimental effect on African American children.

The Court explicitly rejected the "separate but equal" doctrine in the context of public education, stating that separate educational facilities are "inherently unequal" and deprive minority children of equal protection under the law.

## Significance
Brown v. Board of Education is considered one of the most important Supreme Court decisions of the 20th century. It:

1. Marked the beginning of the end of legalized racial segregation in the United States
2. Overturned the "separate but equal" doctrine established in Plessy v. Ferguson (1896)
3. Provided the legal foundation for the civil rights movement of the 1950s and 1960s
4. Established that segregation itself, regardless of material equality of facilities, violated the Constitution
5. Recognized that education is essential to the functioning of a democratic society

The Court did not immediately order implementation of its ruling. In a subsequent decision known as Brown II (1955), the Court ordered desegregation to proceed with "all deliberate speed." This somewhat ambiguous standard led to resistance and delay in many parts of the country, particularly in the South.

Despite implementation challenges, Brown represented a major turning point in American constitutional law and race relations. It laid the groundwork for subsequent civil rights legislation, including the Civil Rights Act of 1964 and the Voting Rights Act of 1965.
    `,
    questions: [
      "What legal doctrine did Brown v. Board of Education overturn?",
      "How did the Court's ruling rely on social science research?",
      "What was the significance of this case for American civil rights?",
      "What were the main arguments presented by both sides in this case?"
    ]
  }
];

// Shorter follow-up questions that can be added to create multi-turn conversations
const followUpQuestions = [
  "Can you elaborate on that point?",
  "How does this relate to modern situations?",
  "What are the implications of this analysis?",
  "Could you provide some specific examples?",
  "What counterarguments might be made against this position?",
  "How might different perspectives view this issue?",
  "What evidence supports this conclusion?",
  "How has this understanding evolved over time?"
];

export const options = {
  stages: [
    { duration: '30s', target: 1 },  // Ramp up
    { duration: '2m', target: 2 },   // Maintain load
    { duration: '30s', target: 0 },  // Ramp down
  ],
  thresholds: {
    'prefill_processing_time': ['p(95)<20000'],  // 95% of prefill processing under 20s
    'failure_rate': ['rate<0.1'],               // Less than 10% failures
  },
};

// Create OpenAI client
const client = oai.createClient({
  url: config.openai.url,
  options: {
    model: config.openai.models.completion,
  },
  headers: {
    'Authorization': `Bearer ${config.openai.key}`,
  },
});

export default function run() {
  // Generate a unique request ID to ensure no caching occurs
  const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  
  // Select a random context template
  let template = JSON.parse(JSON.stringify(any(longContextTemplates))); // Deep copy
  
  // Add randomization to the context to ensure uniqueness
  // Insert the request ID and some random text to prevent any caching
  template.context = template.context.replace(
    /## /g, 
    `## [RequestID: ${requestId}] `
  );
  
  // Select a question from the template
  const mainQuestion = any(template.questions);
  
  // Decide how many conversation turns to include (1-3)
  const conversationTurns = Math.floor(Math.random() * 3) + 1;
  
  // Build the conversation history with uniqueness guarantees
  const messages = [
    { role: 'system', content: `You are a helpful, knowledgeable assistant. Request ID: ${requestId}` },
    { role: 'user', content: template.context + `\n\n[RequestID: ${requestId}] Based on the above information, ${mainQuestion}` }
  ];
  
  // Add conversation history if we're doing multiple turns
  if (conversationTurns > 1) {
    // Add some simulated turns
    for (let i = 1; i < conversationTurns; i++) {
      // Add a simulated assistant response
      messages.push({ 
        role: 'assistant', 
        content: `[Simulated response ${i} for request ${requestId}] This is a simulated previous response to maintain the conversation history and increase the context size.` 
      });
      
      // Add a follow-up question with unique ID
      messages.push({ 
        role: 'user', 
        content: `[Follow-up ${i} for request ${requestId}] ${any(followUpQuestions)}` 
      });
    }
  }
  
  // Calculate total context size
  const contextSize = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  contextSizeMetric.add(contextSize);
  
  // Log details about this run
  console.log(`Prefill test #${requestId} with ${contextSize} chars context, ${conversationTurns} conversation turns`);
  
  // Create payload with short output
  const payload = chatCompletion({
    messages: messages,
    max_tokens: 150,  // Relatively short output for prefill-heavy test
    temperature: 0.3, // Lower temperature for more consistent outputs
  });
  
  // Measure start time
  const startTime = new Date();
  
  try {
    // Send request to OpenAI
    const response = client.chatComplete(payload);
    const content = oai.getContent(response);
    
    // Calculate processing time
    const elapsed = new Date() - startTime;
    
    // Record metrics
    prefillProcessingTime.add(elapsed);
    failureRate.add(0);
    
    // Calculate tokens per second if we have usage info
    if (response.json().usage) {
      const usage = response.json().usage;
      const promptTokens = usage.prompt_tokens;
      const tokenRate = promptTokens / (elapsed / 1000);  // tokens/second
      tokenProcessingRate.add(tokenRate);
      
      console.log(`Processed ${promptTokens} prompt tokens in ${elapsed}ms (${tokenRate.toFixed(2)} tokens/sec)`);
    }
    
    console.log(`Response received in ${elapsed}ms: "${content.substring(0, 50)}..."`);
    
    // Add a pause between requests to avoid rate limiting
    sleep(Math.random() * 3 + 2);  // 2-5 second pause
    
  } catch (error) {
    failureRate.add(1);
    console.error(`Error: ${error.message}`);
    
    // Longer pause after errors
    sleep(10);
  }
}