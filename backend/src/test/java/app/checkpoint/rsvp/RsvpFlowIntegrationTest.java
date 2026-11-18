package app.checkpoint.rsvp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.checkpoint.event.Event;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.dto.RsvpRequest;
import app.checkpoint.rsvp.dto.TicketView;
import app.checkpoint.support.IntegrationTest;
import app.checkpoint.support.TestData;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

/** The member-facing RSVP, ticket and cancel flow, through the HTTP API. */
class RsvpFlowIntegrationTest extends IntegrationTest {

    CurrentOrganizer me;
    Event event;

    @BeforeEach
    void setUp() {
        me = data.newClub();
        event = data.upcomingEvent(me, 2);
    }

    @Test
    void rsvpToAnEventWithSpaceIsConfirmedAndEmailed() throws Exception {
        rsvp(TestData.rsvpRequest("Ada Lovelace"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.waitlistPosition").value(nullValue()))
                .andExpect(jsonPath("$.ticketCode").isNotEmpty())
                .andExpect(jsonPath("$.manageToken").isNotEmpty());

        assertThat(awaitEmails(event.getTitle(), "You're in", 1)).hasSize(1);
    }

    @Test
    void rsvpToAFullEventJoinsTheWaitlistWithItsPosition() throws Exception {
        rsvp(TestData.rsvpRequest("One"));
        rsvp(TestData.rsvpRequest("Two"));

        rsvp(TestData.rsvpRequest("Three"))
                .andExpect(jsonPath("$.status").value("WAITLISTED"))
                .andExpect(jsonPath("$.waitlistPosition").value(1))
                .andExpect(jsonPath("$.ticketCode").value(nullValue()));
        rsvp(TestData.rsvpRequest("Four"))
                .andExpect(jsonPath("$.waitlistPosition").value(2));

        mvc.perform(get("/api/public/events/{id}", event.getId()))
                .andExpect(jsonPath("$.spotsLeft").value(0))
                .andExpect(jsonPath("$.waitlistLength").value(2));
        assertThat(awaitEmails(event.getTitle(), "You're on the waitlist", 2)).hasSize(2);
    }

    @Test
    void theSameEmailCannotRsvpTwiceAndNoSecondEmailIsSent() throws Exception {
        RsvpRequest request = TestData.rsvpRequest("Grace Hopper");
        rsvp(request).andExpect(status().isCreated());

        // Different capitalisation is still the same person.
        RsvpRequest again = new RsvpRequest("Grace Hopper", request.email().toUpperCase(), false, null, false);
        rsvp(again).andExpect(status().isConflict());

        awaitEmails(event.getTitle(), "You're in", 1);
        // The rejected RSVP rolled back, so its email was never sent.
        assertThat(emailSubjectsFor(event.getTitle())).hasSize(1);
    }

    @Test
    void invalidRsvpsAreRejectedWithFieldErrors() throws Exception {
        rsvp(new RsvpRequest("", "not-an-email", false, null, false))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.email").exists());

        // A card number without consent is refused.
        rsvp(new RsvpRequest("Card Person", "card@test.local", false, "301234567", false))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.cardConsentGiven").exists());
    }

    @Test
    void rsvpsCloseOnceTheEventHasStarted() throws Exception {
        Event started = data.pastEvent(me, 10, Instant.now().minus(Duration.ofMinutes(30)));
        mvc.perform(post("/api/public/events/{id}/rsvps", started.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(TestData.rsvpRequest("Late"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("already started")));
    }

    @Test
    void cancellingFreesTheSeatForTheNextPersonOnTheWaitlist() throws Exception {
        TicketView first = ticket(rsvp(TestData.rsvpRequest("First")));
        rsvp(TestData.rsvpRequest("Second"));
        TicketView third = ticket(rsvp(TestData.rsvpRequest("Third")));

        mvc.perform(post("/api/public/tickets/{token}/cancel", first.manageToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.ticketCode").value(nullValue()))
                .andExpect(jsonPath("$.cancellable").value(false));

        mvc.perform(get("/api/public/tickets/{token}", third.manageToken()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.ticketCode").isNotEmpty());
        assertThat(awaitEmails(event.getTitle(), "A seat opened up", 1)).hasSize(1);
        assertThat(awaitEmails(event.getTitle(), "Your RSVP for", 1)).hasSize(1);
    }

    @Test
    void cancellingTwiceIsHarmless() throws Exception {
        TicketView ticket = ticket(rsvp(TestData.rsvpRequest("Twice")));
        mvc.perform(post("/api/public/tickets/{token}/cancel", ticket.manageToken())).andExpect(status().isOk());
        mvc.perform(post("/api/public/tickets/{token}/cancel", ticket.manageToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void anUnknownTicketLinkIs404() throws Exception {
        mvc.perform(get("/api/public/tickets/{token}", "no-such-token")).andExpect(status().isNotFound());
        mvc.perform(post("/api/public/tickets/{token}/cancel", "no-such-token")).andExpect(status().isNotFound());
    }

    @Test
    void raisingTheCapacityPromotesFromTheWaitlist() throws Exception {
        rsvp(TestData.rsvpRequest("A"));
        rsvp(TestData.rsvpRequest("B"));
        TicketView waiting = ticket(rsvp(TestData.rsvpRequest("C")));

        mvc.perform(put("/api/events/{id}", event.getId()).with(as(me))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(eventUpdate(3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmed").value(3))
                .andExpect(jsonPath("$.waitlisted").value(0));

        mvc.perform(get("/api/public/tickets/{token}", waiting.manageToken()))
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void capacityCannotDropBelowTheConfirmedCount() throws Exception {
        rsvp(TestData.rsvpRequest("A"));
        rsvp(TestData.rsvpRequest("B"));

        mvc.perform(put("/api/events/{id}", event.getId()).with(as(me))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(eventUpdate(1))))
                .andExpect(status().isConflict());
    }

    private Map<String, Object> eventUpdate(int capacity) {
        return Map.of("title", event.getTitle(), "location", "SFU Burnaby",
                "startsAt", event.getStartsAt().toString(), "endsAt", event.getEndsAt().toString(),
                "capacity", capacity);
    }

    private ResultActions rsvp(RsvpRequest request) throws Exception {
        return mvc.perform(post("/api/public/events/{id}/rsvps", event.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(request)));
    }

    private TicketView ticket(ResultActions result) throws Exception {
        return json.readValue(result.andReturn().getResponse().getContentAsString(), TicketView.class);
    }
}
