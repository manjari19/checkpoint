package app.checkpoint.notification;

import app.checkpoint.config.AppProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;

/**
 * Sends RSVP emails.
 *
 * <p>AFTER_COMMIT: an email is only sent once the database change it describes is permanent. If the
 * transaction rolls back, for example because of a conflict, nobody gets a misleading email.
 *
 * <p>Async: SMTP can be slow. Sending on a background thread keeps the RSVP request fast and means the
 * event lock is never held while waiting on the mail server.
 *
 * <p>Tradeoff: if the mail server is down, the email is logged as failed and not retried. The RSVP itself
 * is safe, and the RSVP page shows the ticket link straight away. A transactional outbox table would add
 * retries; see the README.
 */
@Component
public class EmailNotifier {

    private static final Logger log = LoggerFactory.getLogger(EmailNotifier.class);

    private final JavaMailSender mailSender;
    private final AppProperties properties;
    private final DateTimeFormatter dateFormat;

    public EmailNotifier(JavaMailSender mailSender, AppProperties properties) {
        this.mailSender = mailSender;
        this.properties = properties;
        // Local time without a zone abbreviation: recipients are local, and B.C.'s move to permanent
        // daylight time makes abbreviations like "PST" misleading.
        this.dateFormat = DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a", Locale.CANADA)
                .withZone(properties.timeZone());
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRsvpNotification(RsvpNotification notification) {
        send(notification);
    }

    void send(RsvpNotification n) {
        EmailContent content = compose(n);
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(properties.mailFrom());
            helper.setTo(n.recipientEmail());
            helper.setSubject(content.subject());
            helper.setText(content.text(), content.html());
            mailSender.send(message);
            log.info("Sent {} email for '{}'", n.kind(), n.eventTitle());
        } catch (MessagingException | RuntimeException e) {
            // Best effort: a failed email must never break anything else. See the class comment.
            log.error("Could not send {} email for '{}'", n.kind(), n.eventTitle(), e);
        }
    }

    EmailContent compose(RsvpNotification n) {
        String ticketUrl = properties.publicBaseUrl() + "/t/" + n.manageToken();
        String when = dateFormat.format(n.eventStartsAt());

        String subject = switch (n.kind()) {
            case CONFIRMED -> "You're in: " + n.eventTitle();
            case WAITLISTED -> "You're on the waitlist for " + n.eventTitle();
            case PROMOTED -> "A seat opened up: you're confirmed for " + n.eventTitle();
            case CANCELLED -> "Your RSVP for " + n.eventTitle() + " is cancelled";
        };
        String lead = switch (n.kind()) {
            case CONFIRMED -> "Your spot is confirmed.";
            case WAITLISTED -> "The event is full, so you're on the waitlist at position "
                    + n.waitlistPosition() + ". If a seat opens up, we'll move you in and email you.";
            case PROMOTED -> "Someone cancelled and you were next on the waitlist, so your spot is now confirmed.";
            case CANCELLED -> "Your RSVP is cancelled. Thanks for letting us know so someone else can take the spot.";
        };
        String action = switch (n.kind()) {
            case CONFIRMED, PROMOTED -> "Show the QR code on your ticket at the door. Can't make it? Cancel from the "
                    + "same page so the next person on the waitlist gets your seat.";
            case WAITLISTED -> "You can check your position or leave the waitlist from your ticket page.";
            case CANCELLED -> "Changed your mind? RSVP again from the event page.";
        };
        boolean showLink = n.kind() != RsvpNotification.Kind.CANCELLED;

        String text = """
                Hi %s,

                %s

                %s
                %s
                %s

                %s
                %s""".formatted(n.recipientName(), lead, n.eventTitle(), when, n.eventLocation(), action,
                showLink ? "\nYour ticket: " + ticketUrl + "\n" : "");

        String html = """
                <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;max-width:520px;margin:0 auto">
                  <div style="background:#1E2176;color:#ffffff;padding:16px 24px;font-weight:bold;font-size:18px">Checkpoint</div>
                  <div style="padding:24px;border:1px solid #e4e4ee;border-top:4px solid #F0A500">
                    <p>Hi %s,</p>
                    <p>%s</p>
                    <p style="margin:20px 0;padding:12px 16px;background:#f6f6fb">
                      <strong>%s</strong><br>%s<br>%s
                    </p>
                    <p>%s</p>
                    %s
                  </div>
                </div>""".formatted(
                escape(n.recipientName()), escape(lead), escape(n.eventTitle()), escape(when),
                escape(n.eventLocation()), escape(action),
                showLink ? "<p><a href=\"" + escape(ticketUrl) + "\" style=\"display:inline-block;background:#1E2176;"
                        + "color:#ffffff;padding:10px 18px;text-decoration:none;border-radius:4px\">View your ticket</a></p>"
                        : "");
        return new EmailContent(subject, text, html);
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }

    record EmailContent(String subject, String text, String html) {
    }
}
