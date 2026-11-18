package app.checkpoint.support;

import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

import app.checkpoint.organizer.CurrentOrganizer;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockReset;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

/**
 * Base class for tests that run the whole application against a real PostgreSQL (Testcontainers).
 *
 * <p>All subclasses share one configuration, so Spring starts the application and the database
 * container once and reuses them for every test class. The mail sender is a Mockito mock so tests can
 * check which emails were sent without a mail server.
 */
@SpringBootTest(properties = {
        // Room for the concurrency tests to really run 40 transactions at once.
        "spring.datasource.hikari.maximum-pool-size=45",
        // Tests create their own clubs; skip the first-run admin account.
        "checkpoint.bootstrap.admin-email="
})
@AutoConfigureMockMvc
@Import({TestcontainersConfig.class, TestData.class})
public abstract class IntegrationTest {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    @Autowired
    protected TestData data;

    // Not reset between tests: emails are sent asynchronously and may arrive just after a test ends.
    // Tests tell their emails apart by the unique event title in the subject.
    @MockitoBean(reset = MockReset.NONE)
    protected JavaMailSender mailSender;

    @BeforeEach
    void stubMailSender() {
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage((Session) null));
    }

    /** Logs the request in as this organizer and adds a valid CSRF token. */
    protected static RequestPostProcessor as(CurrentOrganizer organizer) {
        var auth = UsernamePasswordAuthenticationToken.authenticated(organizer, null,
                List.of(new SimpleGrantedAuthority("ROLE_ORGANIZER")));
        return request -> csrf().postProcessRequest(authentication(auth).postProcessRequest(request));
    }

    /** Subjects of all emails sent so far that mention this event title. */
    protected List<String> emailSubjectsFor(String eventTitle) {
        return mockingDetails(mailSender).getInvocations().stream()
                .filter(invocation -> invocation.getMethod().getName().equals("send"))
                .map(invocation -> invocation.getArgument(0))
                .filter(MimeMessage.class::isInstance)
                .map(message -> subject((MimeMessage) message))
                .filter(Objects::nonNull)
                .filter(subject -> subject.contains(eventTitle))
                .toList();
    }

    /** Emails are sent asynchronously after commit, so wait until the expected number has arrived. */
    protected List<String> awaitEmails(String eventTitle, String subjectStart, int expected) {
        await().atMost(Duration.ofSeconds(10)).until(() ->
                emailSubjectsFor(eventTitle).stream().filter(s -> s.startsWith(subjectStart)).count() >= expected);
        return emailSubjectsFor(eventTitle).stream().filter(s -> s.startsWith(subjectStart)).toList();
    }

    private static String subject(MimeMessage message) {
        try {
            return message.getSubject();
        } catch (MessagingException e) {
            return null;
        }
    }
}
