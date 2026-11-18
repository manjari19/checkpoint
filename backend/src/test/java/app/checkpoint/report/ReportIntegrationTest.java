package app.checkpoint.report;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.checkpoint.event.Event;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpStatus;
import app.checkpoint.support.IntegrationTest;
import java.time.Instant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Attendance history. Uses two past events in Spring 2026 and one in Fall 2026:
 * Ada attends all three, Grace attends one and no-shows one, Katherine cancels.
 */
class ReportIntegrationTest extends IntegrationTest {

    CurrentOrganizer me;
    Rsvp graceNoShow;

    @BeforeEach
    void setUp() {
        me = data.newClub();
        Event january = data.pastEvent(me, 50, Instant.parse("2026-01-22T02:00:00Z"));
        Event march = data.pastEvent(me, 50, Instant.parse("2026-03-12T01:00:00Z"));
        Event october = data.pastEvent(me, 50, Instant.parse("2026-10-08T01:00:00Z"));

        data.rsvpDirectly(january, "ada@test.local", RsvpStatus.CONFIRMED, true);
        data.rsvpDirectly(march, "ada@test.local", RsvpStatus.CONFIRMED, true);
        data.rsvpDirectly(october, "ada@test.local", RsvpStatus.CONFIRMED, true);
        data.rsvpDirectly(january, "grace@test.local", RsvpStatus.CONFIRMED, true);
        graceNoShow = data.rsvpDirectly(march, "grace@test.local", RsvpStatus.CONFIRMED, false);
        data.rsvpDirectly(march, "katherine@test.local", RsvpStatus.CONFIRMED, false);
    }

    @Test
    void membersListShowsAttendanceAndNoShows() throws Exception {
        mvc.perform(get("/api/members").with(as(me)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("ada"))
                .andExpect(jsonPath("$[0].attended").value(3))
                .andExpect(jsonPath("$[0].noShows").value(0))
                .andExpect(jsonPath("$[1].name").value("grace"))
                .andExpect(jsonPath("$[1].attended").value(1))
                .andExpect(jsonPath("$[1].noShows").value(1));
    }

    @Test
    void membersCanBeFilteredByTerm() throws Exception {
        mvc.perform(get("/api/members").param("term", "2026-fall").with(as(me)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("ada"))
                .andExpect(jsonPath("$[0].attended").value(1));
    }

    @Test
    void memberHistoryListsEachEventWithItsOutcome() throws Exception {
        mvc.perform(get("/api/members/{id}", graceNoShow.getMember().getId()).with(as(me)))
                .andExpect(jsonPath("$.attended").value(1))
                .andExpect(jsonPath("$.noShows").value(1))
                .andExpect(jsonPath("$.events.length()").value(2))
                .andExpect(jsonPath("$.events[0].outcome").value("NO_SHOW"))
                .andExpect(jsonPath("$.events[1].outcome").value("ATTENDED"));
    }

    @Test
    void clubSummaryCountsUniqueAttendeesPerTerm() throws Exception {
        mvc.perform(get("/api/reports/summary").param("term", "2026-spring").with(as(me)))
                .andExpect(jsonPath("$.termLabel").value("Spring 2026"))
                .andExpect(jsonPath("$.eventCount").value(2))
                // Ada and Grace; Ada counts once even though she came twice.
                .andExpect(jsonPath("$.uniqueAttendees").value(2))
                .andExpect(jsonPath("$.totalCheckIns").value(3))
                .andExpect(jsonPath("$.trend[0].checkedIn").value(2))
                .andExpect(jsonPath("$.trend[1].checkedIn").value(1))
                .andExpect(jsonPath("$.terms[0].id").value("2026-fall"))
                .andExpect(jsonPath("$.terms[1].id").value("2026-spring"));
    }

    @Test
    void attendanceExportsAsCsv() throws Exception {
        mvc.perform(get("/api/reports/attendance.csv").param("term", "2026-spring").with(as(me)))
                .andExpect(status().isOk())
                .andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andExpect(content().string(containsString("name,email,rsvps,attended,no_shows,last_attended_at")))
                .andExpect(content().string(containsString("grace,grace@test.local,2,1,1,")));
    }

    @Test
    void anUnknownTermIsABadRequest() throws Exception {
        mvc.perform(get("/api/reports/summary").param("term", "2026-winter").with(as(me)))
                .andExpect(status().isBadRequest());
    }
}
