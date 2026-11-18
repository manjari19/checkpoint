package app.checkpoint.rsvp;

import static org.assertj.core.api.Assertions.assertThat;

import app.checkpoint.event.Event;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.dto.TicketView;
import app.checkpoint.support.Concurrently;
import app.checkpoint.support.Concurrently.Outcome;
import app.checkpoint.support.IntegrationTest;
import app.checkpoint.support.TestData;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Proves the seat rules hold when many requests hit the same event at the same instant.
 *
 * <p>These tests use real threads and a real PostgreSQL, so they exercise the actual row locks.
 * Each scenario repeats a few times because a race that is missed once can show up on the next run.
 */
class WaitlistConcurrencyTest extends IntegrationTest {

    @Autowired
    RsvpService rsvpService;

    @Autowired
    RsvpRepository rsvps;

    @Autowired
    TransactionTemplate tx;

    CurrentOrganizer me;

    @BeforeEach
    void setUp() {
        me = data.newClub();
    }

    @RepeatedTest(3)
    void manySimultaneousRsvpsNeverOverfillTheEvent() throws Exception {
        Event event = data.upcomingEvent(me, 10);

        List<Callable<TicketView>> tasks = IntStream.range(0, 40)
                .<Callable<TicketView>>mapToObj(i -> () -> rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Member " + i)))
                .toList();
        List<Outcome<TicketView>> outcomes = Concurrently.run(tasks);

        assertThat(outcomes).allMatch(Outcome::succeeded);
        assertThat(count(event, RsvpStatus.CONFIRMED)).isEqualTo(10);
        assertThat(count(event, RsvpStatus.WAITLISTED)).isEqualTo(30);
        // Everyone on the waitlist got a different position, 1 to 30.
        assertThat(outcomes.stream().map(o -> o.value().waitlistPosition()).filter(p -> p != null).sorted())
                .containsExactlyElementsOf(IntStream.rangeClosed(1, 30).boxed().toList());
    }

    @RepeatedTest(3)
    void simultaneousCancellationsPromoteExactlyThatManyPeopleInWaitlistOrder() throws Exception {
        Event event = data.upcomingEvent(me, 20);
        List<TicketView> confirmed = rsvpInOrder(event, 20);
        List<TicketView> waitlist = rsvpInOrder(event, 25);

        // 15 confirmed people cancel at the same moment.
        List<Callable<TicketView>> cancels = confirmed.subList(0, 15).stream()
                .<Callable<TicketView>>map(t -> () -> rsvpService.cancel(t.manageToken()))
                .toList();
        assertThat(Concurrently.run(cancels)).allMatch(Outcome::succeeded);

        // Exactly 15 promoted, never more than capacity...
        assertThat(count(event, RsvpStatus.CONFIRMED)).isEqualTo(20);
        assertThat(count(event, RsvpStatus.WAITLISTED)).isEqualTo(10);
        // ...and they are the first 15 people in line, not just any 15.
        Map<String, RsvpStatus> status = statusByToken(event);
        waitlist.subList(0, 15).forEach(t -> assertThat(status.get(t.manageToken())).isEqualTo(RsvpStatus.CONFIRMED));
        waitlist.subList(15, 25).forEach(t -> assertThat(status.get(t.manageToken())).isEqualTo(RsvpStatus.WAITLISTED));
        // ...and each of them got exactly one "a seat opened up" email.
        assertThat(awaitEmails(event.getTitle(), "A seat opened up", 15)).hasSize(15);
    }

    @RepeatedTest(3)
    void cancellationsRacingNewRsvpsGiveFreedSeatsToTheWaitlistFirst() throws Exception {
        Event event = data.upcomingEvent(me, 5);
        List<TicketView> confirmed = rsvpInOrder(event, 5);
        List<TicketView> waitlist = rsvpInOrder(event, 8);

        // 5 cancellations and 15 brand-new RSVPs, all at once.
        List<Callable<Object>> tasks = new ArrayList<>();
        confirmed.forEach(t -> tasks.add(() -> rsvpService.cancel(t.manageToken())));
        IntStream.range(0, 15).forEach(i ->
                tasks.add(() -> rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Latecomer " + i))));
        List<Outcome<Object>> outcomes = Concurrently.run(tasks);

        assertThat(outcomes).allMatch(Outcome::succeeded);
        assertThat(count(event, RsvpStatus.CONFIRMED)).isEqualTo(5);
        // A freed seat is handed to the waitlist inside the cancel transaction, so a newcomer can never
        // grab it first: the 5 seats go to the first 5 people who were already waiting.
        Map<String, RsvpStatus> status = statusByToken(event);
        waitlist.subList(0, 5).forEach(t -> assertThat(status.get(t.manageToken())).isEqualTo(RsvpStatus.CONFIRMED));
        assertThat(count(event, RsvpStatus.WAITLISTED)).isEqualTo(3 + 15);
    }

    @Test
    void cancellingTheSameTicketFromSeveralTabsPromotesOnlyOnePerson() throws Exception {
        Event event = data.upcomingEvent(me, 3);
        List<TicketView> confirmed = rsvpInOrder(event, 3);
        rsvpInOrder(event, 5);

        String token = confirmed.getFirst().manageToken();
        List<Callable<TicketView>> sameCancel = IntStream.range(0, 8)
                .<Callable<TicketView>>mapToObj(i -> () -> rsvpService.cancel(token))
                .toList();
        assertThat(Concurrently.run(sameCancel)).allMatch(Outcome::succeeded);

        assertThat(count(event, RsvpStatus.CONFIRMED)).isEqualTo(3);
        assertThat(count(event, RsvpStatus.WAITLISTED)).isEqualTo(4);
        assertThat(count(event, RsvpStatus.CANCELLED)).isEqualTo(1);
    }

    @Test
    void theSameEmailSubmittedTwiceAtOnceGetsOnlyOneRsvp() throws Exception {
        Event event = data.upcomingEvent(me, 10);
        var request = TestData.rsvpRequest("Double Clicker");

        List<Outcome<TicketView>> outcomes = Concurrently.run(List.of(
                () -> rsvpService.rsvp(event.getId(), request),
                () -> rsvpService.rsvp(event.getId(), request)));

        assertThat(outcomes.stream().filter(Outcome::succeeded)).hasSize(1);
        assertThat(count(event, RsvpStatus.CONFIRMED)).isEqualTo(1);
    }

    /** RSVPs one at a time so their waitlist order is known. */
    private List<TicketView> rsvpInOrder(Event event, int howMany) {
        return IntStream.range(0, howMany)
                .mapToObj(i -> rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Person " + UUID.randomUUID())))
                .toList();
    }

    private long count(Event event, RsvpStatus status) {
        return rsvps.countByEventIdAndStatus(event.getId(), status);
    }

    private Map<String, RsvpStatus> statusByToken(Event event) {
        return tx.execute(s -> rsvps.findByEventIdOrderByCreatedAtAscIdAsc(event.getId()).stream()
                .collect(Collectors.toMap(Rsvp::getManageToken, Rsvp::getStatus)));
    }
}
