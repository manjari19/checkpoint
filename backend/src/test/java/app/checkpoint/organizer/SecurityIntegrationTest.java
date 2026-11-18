package app.checkpoint.organizer;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import app.checkpoint.event.Event;
import app.checkpoint.support.IntegrationTest;
import app.checkpoint.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;

class SecurityIntegrationTest extends IntegrationTest {

    @Test
    void organizerEndpointsNeedALogin() throws Exception {
        mvc.perform(get("/api/events")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/members")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void publicPagesAndApiDocsDoNot() throws Exception {
        CurrentOrganizer me = data.newClub();
        Event event = data.upcomingEvent(me, 5);
        mvc.perform(get("/api/public/events/{id}", event.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value(event.getTitle()));
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
    }

    @Test
    void organizersCannotSeeAnotherClubsEvents() throws Exception {
        CurrentOrganizer mine = data.newClub();
        CurrentOrganizer theirs = data.newClub();
        Event theirEvent = data.upcomingEvent(theirs, 5);

        mvc.perform(get("/api/events/{id}", theirEvent.getId()).with(as(mine))).andExpect(status().isNotFound());
        mvc.perform(get("/api/events/{id}/rsvps", theirEvent.getId()).with(as(mine))).andExpect(status().isNotFound());
        mvc.perform(get("/api/events/{id}/stats", theirEvent.getId()).with(as(mine))).andExpect(status().isNotFound());
        mvc.perform(get("/api/events").with(as(mine))).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void loginWithTheRightPasswordStartsASession() throws Exception {
        CurrentOrganizer me = data.newClub();
        MockHttpSession session = (MockHttpSession) mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(me.email(), TestData.PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clubId").value(me.clubId().toString()))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andReturn().getRequest().getSession();

        mvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(me.email()));
    }

    @Test
    void loginWithAWrongPasswordIs401() throws Exception {
        CurrentOrganizer me = data.newClub();
        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"wrong\"}".formatted(me.email())))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void organizerWritesWithoutACsrfTokenAreRefused() throws Exception {
        CurrentOrganizer me = data.newClub();
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(me.email(), TestData.PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void theCsrfCookieIsReadableBySinglePageApp() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(cookie().exists("XSRF-TOKEN"))
                .andExpect(cookie().httpOnly("XSRF-TOKEN", false));
    }
}
