package app.checkpoint.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Turns on @Async so emails are sent on Spring Boot's background task executor. */
@Configuration
@EnableAsync
public class AsyncConfig {
}
