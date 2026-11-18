package app.checkpoint.sponsor;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.checkpoint.event.Event;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.RsvpService;
import app.checkpoint.rsvp.dto.TicketView;
import app.checkpoint.sponsor.dto.SponsorView;
import app.checkpoint.support.IntegrationTest;
import app.checkpoint.support.TestData;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class SponsorBoothIntegrationTest extends IntegrationTest {

    @Autowired
    RsvpService rsvpService;

    @Autowired
    SponsorService sponsorService;

    CurrentOrganizer me;
    Event event;
    SponsorView sponsor;

    @BeforeEach
    void setUp() {
        me = data.newClub();
        event = data.upcomingEvent(me, 20);
        sponsor = sponsorService.add(me, event.getId(), "Acme Software");
    }

    @Test
    void scanningAnOptedInAttendeeSavesTheirContactOnce() throws Exception {
        TicketView ticket = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Ada", true, null));

        scan(sponsor.boothCode(), ticket.ticketCode())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("SAVED"))
                .andExpect(jsonPath("$.lead.name").value("Ada"))
                .andExpect(jsonPath("$.lead.email").value(ticket.attendeeEmail()));
        scan(sponsor.boothCode(), ticket.ticketCode())
                .andExpect(jsonPath("$.outcome").value("ALREADY_SAVED"));

        mvc.perform(get("/api/booth/{code}", sponsor.boothCode()))
                .andExpect(jsonPath("$.sponsorName").value("Acme Software"))
                .andExpect(jsonPath("$.leads.length()").value(1));
    }

    @Test
    void attendeesWhoDidNotOptInRevealNothing() throws Exception {
        TicketView ticket = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Private Person", false, null));

        scan(sponsor.boothCode(), ticket.ticketCode())
                .andExpect(jsonPath("$.outcome").value("NOT_OPTED_IN"))
                .andExpect(jsonPath("$.lead").doesNotExist())
                .andExpect(content().string(not(containsString("Private Person"))));
    }

    @Test
    void ticketsForOtherEventsAndBadBoothLinksAreRejected() throws Exception {
        Event other = data.upcomingEvent(me, 5);
        TicketView elsewhere = rsvpService.rsvp(other.getId(), TestData.rsvpRequest("Elsewhere", true, null));
        scan(sponsor.boothCode(), elsewhere.ticketCode()).andExpect(jsonPath("$.outcome").value("NOT_FOUND"));

        scan("not-a-booth-code", elsewhere.ticketCode()).andExpect(status().isNotFound());
    }

    @Test
    void organizersCanExportSponsorContactsAsCsv() throws Exception {
        TicketView ada = rsvpService.rsvp(event.getId(), TestData.rsvpRequest("Ada", true, null));
        scan(sponsor.boothCode(), ada.ticketCode());

        mvc.perform(get("/api/events/{id}/sponsor-leads.csv", event.getId()).with(as(me)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("sponsor-contacts.csv")))
                .andExpect(content().string(containsString("sponsor,name,email,scanned_at")))
                .andExpect(content().string(containsString("Acme Software,Ada," + ada.attendeeEmail())));
    }

    @Test
    void removingASponsorDisablesTheirBoothLink() throws Exception {
        mvc.perform(delete("/api/events/{e}/sponsors/{s}", event.getId(), sponsor.id()).with(as(me)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/booth/{code}", sponsor.boothCode())).andExpect(status().isNotFound());
    }

    @Test
    void sponsorsGivenAtCreationGetTheirOwnBoothCodes() throws Exception {
        mvc.perform(post("/api/events").with(as(me))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Networking Night","location":"SFU Burnaby","capacity":80,
                                 "startsAt":"2030-01-21T02:00:00Z","endsAt":"2030-01-21T05:00:00Z",
                                 "sponsors":["SAP","Acme"]}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sponsors.length()").value(2))
                .andExpect(jsonPath("$.sponsors[0].boothCode").isNotEmpty());
    }

    private ResultActions scan(String boothCode, String ticketCode) throws Exception {
        return mvc.perform(post("/api/booth/{code}/scans", boothCode)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("ticketCode", ticketCode))));
    }
}
