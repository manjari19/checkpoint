package app.checkpoint.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;

import app.checkpoint.organizer.CurrentOrganizer;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import jakarta.servlet.http.Cookie;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.test.context.bean.override.mockito.MockReset;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.util.ReflectionTestUtils;
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

    @Autowired
    private FilterChainProxy securityFilterChain;

    @BeforeEach
    void stubMailSender() {
        when(mailSender.createMimeMessage()).thenAnswer(invocation -> new MimeMessage((Session) null));
    }

    /**
     * Guards against Spring Security's csrf() test helper. That helper does not just add a token to one
     * request: it replaces the CSRF repository inside the application's real CsrfFilter with a session-based
     * one. All integration tests share one cached application, so after the first test that used it, the
     * server stopped sending the XSRF-TOKEN cookie, and any test that expects the cookie failed or passed
     * depending on which test happened to run first. Fails straight away if anything swaps it again.
     */
    @AfterEach
    void csrfFilterStillUsesTheCookieRepository() {
        CsrfFilter filter = securityFilterChain.getFilterChains().stream()
                .flatMap(chain -> chain.getFilters().stream())
                .filter(CsrfFilter.class::isInstance)
                .map(CsrfFilter.class::cast)
                .findFirst()
                .orElseThrow();
        assertThat(ReflectionTestUtils.getField(filter, "tokenRepository"))
                .as("CSRF repository of the application's CsrfFilter (use csrfToken(), never csrf())")
                .isInstanceOf(CookieCsrfTokenRepository.class);
    }

    /**
     * Sends a CSRF token the way the Angular app does: the same random value in the XSRF-TOKEN cookie and
     * the X-XSRF-TOKEN header. The server checks that they match, so this goes through the real CSRF setup.
     */
    protected static RequestPostProcessor csrfToken() {
        return request -> {
            String token = UUID.randomUUID().toString();
            Cookie[] existing = request.getCookies() == null ? new Cookie[0] : request.getCookies();
            request.setCookies(Stream.concat(Stream.of(existing), Stream.of(new Cookie("XSRF-TOKEN", token)))
                    .toArray(Cookie[]::new));
            request.addHeader("X-XSRF-TOKEN", token);
            return request;
        };
    }

    /** Logs the request in as this organizer and adds a valid CSRF token. */
    protected static RequestPostProcessor as(CurrentOrganizer organizer) {
        var auth = UsernamePasswordAuthenticationToken.authenticated(organizer, null,
                List.of(new SimpleGrantedAuthority("ROLE_ORGANIZER")));
        return request -> csrfToken().postProcessRequest(authentication(auth).postProcessRequest(request));
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
