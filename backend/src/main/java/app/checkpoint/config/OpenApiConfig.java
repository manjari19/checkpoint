package app.checkpoint.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI checkpointOpenApi() {
        return new OpenAPI().info(new Info()
                .title("Checkpoint API")
                .version("0.1.0")
                .description("""
                        Event RSVPs, waitlists and check-in for student clubs.

                        To try the organizer endpoints here: call POST /api/auth/login under "Auth" first.
                        The browser keeps the session cookie, and Swagger UI sends the CSRF token for you."""));
    }
}
