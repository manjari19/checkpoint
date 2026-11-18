# Build stage: compile and package the Spring Boot jar with Java 21.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q package -DskipTests

# Run stage: only the JRE and the jar, running as a non-root user.
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/target/checkpoint-api.jar app.jar
USER app
EXPOSE 8180
HEALTHCHECK --interval=10s --timeout=3s --start-period=40s --retries=5 \
  CMD wget -qO- http://localhost:8180/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
