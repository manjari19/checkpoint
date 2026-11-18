package app.checkpoint.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import app.checkpoint.config.AppProperties;
import app.checkpoint.notification.RsvpNotification.Kind;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class EmailNotifierTest {

    @Mock
    JavaMailSender mailSender;

    EmailNotifier notifier;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties("https://checkpoint.example", ZoneOffset.ofHours(-8),
                "Checkpoint <no-reply@checkpoint.example>", "key", null);
        notifier = new EmailNotifier(mailSender, properties);
    }

    @Test
    void confirmationEmailHasTheTicketLinkAndLocalTime() throws Exception {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));

        notifier.send(notification(Kind.CONFIRMED, null));

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(sent.capture());
        assertThat(sent.getValue().getSubject()).isEqualTo("You're in: Networking Night");
        assertThat(sent.getValue().getAllRecipients()[0].toString()).isEqualTo("ada@test.local");
    }

    @Test
    void emailBodiesMatchTheirKind() {
        var confirmed = notifier.compose(notification(Kind.CONFIRMED, null));
        assertThat(confirmed.text()).contains("https://checkpoint.example/t/manage-token-123")
                // 02:00 UTC on Jan 21 is 6:00 p.m. on Jan 20 at UTC-8 (a fixed offset keeps this test independent of DST rules).
                .contains("Wednesday, January 20, 2027 at 6:00");

        var waitlisted = notifier.compose(notification(Kind.WAITLISTED, 4));
        assertThat(waitlisted.subject()).isEqualTo("You're on the waitlist for Networking Night");
        assertThat(waitlisted.text()).contains("position 4");

        var promoted = notifier.compose(notification(Kind.PROMOTED, null));
        assertThat(promoted.subject()).startsWith("A seat opened up");

        var cancelled = notifier.compose(notification(Kind.CANCELLED, null));
        assertThat(cancelled.text()).doesNotContain("/t/manage-token-123");
    }

    @Test
    void namesAreHtmlEscapedInTheHtmlVersion() {
        var email = notifier.compose(new RsvpNotification(Kind.CONFIRMED, "x@test.local", "<script>",
                "Night", Instant.parse("2027-01-21T02:00:00Z"), "SFU", "t", null));
        assertThat(email.html()).contains("&lt;script&gt;").doesNotContain("<script>");
    }

    @Test
    void aMailServerFailureIsLoggedNotThrown() {
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage((Session) null));
        doThrow(new MailSendException("connection refused")).when(mailSender).send(any(MimeMessage.class));

        assertThatCode(() -> notifier.send(notification(Kind.CONFIRMED, null))).doesNotThrowAnyException();
    }

    private static RsvpNotification notification(Kind kind, Integer position) {
        return new RsvpNotification(kind, "ada@test.local", "Ada", "Networking Night",
                Instant.parse("2027-01-21T02:00:00Z"), "SFU Burnaby", "manage-token-123", position);
    }
}
