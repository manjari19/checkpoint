package app.checkpoint.checkin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.checkpoint.checkin.dto.CheckInResult;
import app.checkpoint.checkin.dto.CheckInResult.Outcome;
import app.checkpoint.common.ConflictException;
import app.checkpoint.event.Event;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.RsvpService;
import app.checkpoint.rsvp.dto.TicketView;
import app.checkpoint.support.Concurrently;
import app.checkpoint.support.IntegrationTest;
import app.checkpoint.support.TestData;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

class CheckInIntegrationTest extends IntegrationTest {

    @Autowired
    RsvpService rsvpService;

    @Autowired
    CheckInService checkIns;

    @Autowired
    JdbcTemplate jdbc;

    CurrentOrganizer me;
    Event event;

    @BeforeEach
    void setUp() {
        me = data.newClub();
        event = data.upcomingEvent(me, 1);
    }

    @Test
    void scanningATicketChecksInAndScanningAgainSaysAlreadyCheckedIn() throws Exception {
        TicketView ticket = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Ada"));

        scanTicket(event, ticket.ticketCode())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("CHECKED_IN"))
                .andExpect(jsonPath("$.attendeeName").value("Ada"))
                .andExpect(jsonPath("$.method").value("QR"));

        scanTicket(event, ticket.ticketCode())
                .andExpect(jsonPath("$.outcome").value("ALREADY_CHECKED_IN"))
                .andExpect(jsonPath("$.message").value("Ada is already checked in."))
                .andExpect(jsonPath("$.checkedInAt").isNotEmpty());
    }

    @Test
    void twoPhonesScanningTheSameTicketAtOnceCheckInExactlyOnce() throws Exception {
        TicketView ticket = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Grace"));

        List<Callable<CheckInResult>> scans = IntStream.range(0, 10)
                .<Callable<CheckInResult>>mapToObj(i -> () -> checkIns.byTicket(me, event.getId(), ticket.ticketCode()))
                .toList();
        List<Outcome> outcomes = Concurrently.run(scans).stream().map(o -> o.value().outcome()).toList();

        assertThat(outcomes).containsOnlyOnce(Outcome.CHECKED_IN);
        assertThat(outcomes).filteredOn(o -> o == Outcome.ALREADY_CHECKED_IN).hasSize(9);
    }

    @Test
    void waitlistedTicketsAreNotCheckedIn() throws Exception {
        rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Seated"));
        TicketView waiting = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Waiting"));
        // A waitlisted ticket has no QR code; look up its code the way a stale screenshot would carry it.
        String code = jdbc.queryForObject("select ticket_code from rsvp where manage_token = ?", String.class,
                waiting.manageToken());

        scanTicket(event, code).andExpect(jsonPath("$.outcome").value("NOT_CONFIRMED"));
    }

    @Test
    void aTicketForAnotherEventOrAnotherClubIsRecognised() throws Exception {
        Event other = data.upcomingEvent(me, 5);
        TicketView otherTicket = rsvpService.rsvp(other.getId(), TestData.rsvpRequest("Elsewhere"));
        scanTicket(event, otherTicket.ticketCode()).andExpect(jsonPath("$.outcome").value("WRONG_EVENT"));

        CurrentOrganizer otherClub = data.newClub();
        Event otherClubEvent = data.upcomingEvent(otherClub, 5);
        TicketView foreign = rsvpService.rsvp(otherClubEvent.getId(), TestData.rsvpRequest("Foreign"));
        // Another club's ticket reveals nothing, not even the event name.
        scanTicket(event, foreign.ticketCode()).andExpect(jsonPath("$.outcome").value("NOT_FOUND"));
        scanTicket(event, "garbage").andExpect(jsonPath("$.outcome").value("NOT_FOUND"));
    }

    @Test
    void studentCardChecksInAMemberWhoLinkedIt() throws Exception {
        rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Katherine", false, "301234567"));

        // Scanners may add spaces or dashes; the number is normalised before hashing.
        scanCard(event, "301-234 567")
                .andExpect(jsonPath("$.outcome").value("CHECKED_IN"))
                .andExpect(jsonPath("$.method").value("CARD"));
        scanCard(event, "301234567").andExpect(jsonPath("$.outcome").value("ALREADY_CHECKED_IN"));
    }

    @Test
    void theRawCardNumberIsNeverStored() {
        rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Private", false, "309876543"));

        String dump = jdbc.queryForList("select * from member").toString();
        assertThat(dump).doesNotContain("309876543");
        String hash = jdbc.queryForObject("select card_hash from member where card_hash is not null "
                + "and email like 'private-%'", String.class);
        assertThat(hash).hasSize(64).matches("[0-9a-f]+");
    }

    @Test
    void unknownCardsAndMembersWithoutAnRsvpGetClearMessages() throws Exception {
        scanCard(event, "300000001").andExpect(jsonPath("$.outcome").value("NOT_FOUND"));

        Event other = data.upcomingEvent(me, 5);
        rsvpService.rsvp(other.getId(), TestData.rsvpRequest("Other Event", false, "300000002"));
        scanCard(event, "300000002")
                .andExpect(jsonPath("$.outcome").value("NO_RSVP"))
                .andExpect(jsonPath("$.message").value("Other Event doesn't have an RSVP for this event."));
    }

    @Test
    void aCardAlreadyLinkedToSomeoneElseIsRefused() {
        rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Owner", false, "301111111"));
        Event other = data.upcomingEvent(me, 5);
        assertThatThrownBy(() -> rsvpService.rsvp(other.getId(), TestData.rsvpRequest("Impostor", false, "301111111")))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already linked to another member");
    }

    @Test
    void organizersCanCheckSomeoneInManuallyFromTheList() throws Exception {
        TicketView ticket = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("No Phone"));
        String rsvpId = jdbc.queryForObject("select id::text from rsvp where manage_token = ?", String.class,
                ticket.manageToken());

        mvc.perform(post("/api/events/{e}/check-ins/rsvp/{r}", event.getId(), rsvpId).with(as(me)))
                .andExpect(jsonPath("$.outcome").value("CHECKED_IN"))
                .andExpect(jsonPath("$.method").value("MANUAL"));
    }

    @Test
    void aCheckedInRsvpCannotBeCancelled() throws Exception {
        TicketView ticket = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Arrived"));
        scanTicket(event, ticket.ticketCode());

        mvc.perform(post("/api/public/tickets/{t}/cancel", ticket.manageToken()))
                .andExpect(status().isConflict());
    }

    private ResultActions scanTicket(Event target, String code) throws Exception {
        return mvc.perform(post("/api/events/{id}/check-ins/ticket", target.getId()).with(as(me))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("ticketCode", code))));
    }

    private ResultActions scanCard(Event target, String number) throws Exception {
        return mvc.perform(post("/api/events/{id}/check-ins/card", target.getId()).with(as(me))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("cardNumber", number))));
    }
}
