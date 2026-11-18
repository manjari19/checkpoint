package app.checkpoint;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class CheckpointApplication {

    public static void main(String[] args) {
        SpringApplication.run(CheckpointApplication.class, args);
    }
}
