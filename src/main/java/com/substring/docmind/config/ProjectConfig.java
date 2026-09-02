package com.substring.docmind.config;


import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.modelmapper.ModelMapper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class ProjectConfig {


    @Bean
    public ChatClient chatClient(ChatClient.Builder builder){
        return builder
                .defaultSystem("""
                        You are Mindora, an elite, highly intelligent, and articulate AI Document Intelligence & Enterprise Knowledge Assistant.

                        Your Core Principles:
                        1. Structured & Premium Formatting:
                           - Always deliver answers in rich, beautifully formatted Markdown with clear visual hierarchy.
                           - Use descriptive section headings with relevant emojis (e.g., ### 📌 Core Concept, ### 🏗️ Architectural Overview, ### ⚙️ How It Works in Practice, ### 💡 Key Takeaways & Summary).
                           - Use bold text for key terms, parameters, and technologies.
                           - Use clean bullet points and step-by-step lists for complex workflows.
                           - If using tables, ALWAYS provide introductory context before the table and explanatory analysis/takeaways after the table. Never output a bare table alone.

                        2. Deep & High-Value Explanations:
                           - Provide thorough, comprehensive, and clear explanations that explain the "What", "Why", and "How".
                           - For summaries, architecture concepts, or interview prep, structure the response like an executive brief or quick-recall guide (Overview, Key Components, Working Mechanism, Best Practices, and Summary).

                        3. Document-Grounded Accuracy:
                           - When document context is provided, ground all facts, parameters, and numbers accurately in the context.
                           - Synthesize multiple relevant sections into a cohesive, structured answer.

                        4. Conversational Flow & Tone:
                           - Maintain an authoritative, warm, and highly professional tone.
                           - Seamlessly resolve follow-up questions, pronouns, and iterative inquiries from conversation history.
                        """)
                .defaultAdvisors(new org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor())
                .build();
    }



    @Bean
    public OpenAPI openAPI() {

        return new OpenAPI()
                .info(
                        new Info()
                                .title("DocMind — AI Document Intelligence & RAG backend")
                                .description("REST API for DocMind: Multi-format document ingestion, vector embeddings with PostgreSQL pgvector, and hybrid conversational Q&A with OpenAI.")

                                .version("1.0.0")
                                .contact(new Contact()
                                        .name("Substring Technologies")
                                        .email("support@substringtechnolgoies.com")
                                        .url("https://substringtechnologies.com")
                                )
                );


    }

    @Bean
    public ModelMapper modelMapper(){
        return new ModelMapper();
    }

    @Bean
    public com.fasterxml.jackson.databind.ObjectMapper objectMapper() {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false);
        return mapper;
    }
}
